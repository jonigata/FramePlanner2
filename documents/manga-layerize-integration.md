# manga-layerize サービス連携ガイド

FramePlanner エディタから「ページ 1 枚をキャラ別レイヤー / コマ別レイヤーに分解する」
ためのサービス。MangaFarm 配下 (SvelteKit + Cloudflare Worker + Workflow + Modal + fal.ai)
で動いていて、FramePlanner 側からは **MangaFarm SvelteKit に対する 3 つの REST 呼び出し**
だけを意識すれば良い。本ドキュメントはその API 仕様 + 出力 ZIP の中身 + 認証/課金の
扱い + 実装フローをまとめたもの。

> 上流側 (Worker / Modal / Workflow) の中身は本ドキュメントの範囲外。FramePlanner からは
> ブラックボックスとして使う。

---

## 概要 (このサービスは何をするか)

入力: マンガ 1 ページの PNG (FramePlanner エディタ内の任意の 1 ページ画像)。

出力: ZIP 1 個。中に以下が入る:

- `clean_page.png` — フキダシを消去・背景再構成したページ
- `layers/00_background.png` — キャラもフキダシも消えた背景
- `layers/01_char.png` ... `NN_char.png` — 各キャラの **元ページサイズ** RGBA レイヤー
- `panels/panel_NN/` — コマ単位にクロップした `panel.png` / `bg.png` / `char_NN.png` / `composite.png`
- `manifest.json` — フレーム / キャラ / フキダシの座標 + **`frame_tree` (FramePlanner FrameElement.compile に渡せる markUp ツリー)** + 相互参照を詰めたメタデータ

`layers/0N_char.png` を `layers/00_background.png` の上に α 合成すれば `clean_page.png`
にほぼ一致する。フキダシは **再配置用の bbox を manifest に残してある** だけで、
レイヤーとしては抜かれていない (FramePlanner 側でベクトル吹き出しとして再生成する想定)。

処理は **2〜5 分の非同期ジョブ**。`/request` で投げて jobId を受け取り、`/status` で
ポーリング、`completed` になったら `/result` で ZIP をダウンロードする。

---

## 認証・課金

### 認証
- **必須**: MangaFarm のログイン済 session cookie。未ログインは 401。
- FramePlanner が MangaFarm 配下にあるならそのまま session が共有される。
- 実装側の追加実装は不要 (普通に MangaFarm のドメインに対する `fetch(..., { credentials: 'include' })` など)。

### 課金
- **フィーチャーフラグ `CHARGE_ENABLED` で制御**。`false` の間は無料 (Phase 3 期間)。
- `true` 時の単価: **10 Feathral / 1 ページ**。
- 残高不足は `/request` が **HTTP 402 "Insufficient Feathral"** を返す。FramePlanner 側で
  Spryt 購入導線へ誘導するモーダルを出すなどの対応を推奨。
- 残高は `/request` 時に reserve、ジョブ成功で finalize、失敗 / abandoned で cancel。
  FramePlanner はこの 2PC を意識する必要なし (内部実装)。

### 同時実行制限
- `/request` 時に **そのユーザの 5 分以上前の pending/processing ジョブは abandoned 扱い**
  に sweep される (= その時点で残高が戻る)。
- 実質「同時 1 ジョブ」想定だが、明示的な 429 は今は返していない。連投すると古いジョブが
  失敗扱いに上書きされるだけ。

---

## API 仕様 (MangaFarm SvelteKit)

ベース URL: 開発時は `https://example.local:5174` (Vite dev サーバ、`npm run dev-https` で起動)。
本番は MangaFarm 本番ドメイン。FramePlanner 側の URL 構築は
`src/utils/mangaLayerize.ts` の `getMangaFarmBase()` を参照。

### 1. POST `/api/manga-layerize/request` — ジョブ投入

**Request**

```http
POST /api/manga-layerize/request HTTP/1.1
Origin: <mangafarm-or-frameplanner-origin>   ← SvelteKit CSRF を満たすために必須
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="image"; filename="page.png"
Content-Type: image/png

<binary PNG bytes>
--boundary
Content-Disposition: form-data; name="sourceRef"

<任意の caller-side 識別子。例: FramePlanner ページ UUID。サービス側は格納するだけ>
--boundary--
```

- `image` は **PNG 必須** (実装側で他形式を弾いている)。最大 20 MB。
- `sourceRef` は省略可。

**Response 200**

```json
{ "jobId": "a1b986b0-dcdf-4be4-902a-b7ea631872d1", "status": "processing" }
```

**よくあるエラー**

| HTTP | 意味 | FramePlanner 側の対応 |
|---|---|---|
| 401 | 未ログイン | ログイン誘導 |
| 402 | Feathral 不足 (CHARGE_ENABLED=true 時) | チャージ画面誘導 |
| 413 | 画像が 20 MB 超 | 画像縮小して再送 |
| 415 | PNG 以外 | PNG にエンコードし直す |
| 502 | 内部 Worker 連携失敗 | リトライ可。続いたらサーバ側調査 |

---

### 2. GET `/api/manga-layerize/status/[jobId]` — 進捗取得

**Request** (cookie 必須)

```http
GET /api/manga-layerize/status/<jobId> HTTP/1.1
```

**Response 200**

```json
{
  "jobId": "a1b986b0-dcdf-4be4-902a-b7ea631872d1",
  "status": "processing",                    // pending / processing / completed / failed
  "source": "frameplanner",
  "sourceRef": "<request 時に渡したやつ>",
  "errorMessage": null,
  "createdAt": "2026-05-02T10:11:12.345Z",
  "updatedAt": "2026-05-02T10:11:12.345Z",
  "completedAt": null,
  "hasOutput": false,                        // true なら /result から ZIP DL 可
  "manifest": null                           // 完了時は manifest.json の中身が入る
}
```

- 自分のジョブ以外は **403 forbidden**。
- 該当 jobId なし: 404。
- 5 分超過の pending/processing は **このエンドポイントが呼ばれた瞬間に failed に書き換わる**
  (pull-on-read sweep)。ポーリングしてれば自動的に救われる。

**ポーリング間隔の推奨**: 3〜5 秒。ジョブ平均所要時間 2〜5 分なので 3 秒だと最大 ~100 回。

---

### 3. GET `/api/manga-layerize/result/[jobId]` — ZIP ダウンロード

**Request** (cookie 必須)

```http
GET /api/manga-layerize/result/<jobId> HTTP/1.1
```

**Response 200**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="<jobId>.zip"
Content-Length: <bytes>

<ZIP バイナリ>
```

- 自分のジョブ以外は **403**。
- 完了前に呼ぶと **409 "job not completed"**。
- ZIP 実体は Cloudflare R2 にあり、SvelteKit がストリーミングで中継する。サイズ 5〜30 MB。
- R2 ライフサイクルで **7 日後に自動削除** されるので、必要なら FramePlanner 側で永続化
  (Firebase / IndexedDB / Supabase Storage 等) すること。

---

## ZIP の中身 (詳細)

```
<jobId>.zip
├── clean_page.png                     入力ページからフキダシ・テキストを除去 + 背後を再構成
├── manifest.json                      下記参照
├── layers/
│   ├── 00_background.png              キャラもフキダシも全部消えた背景 (元ページサイズ RGB)
│   ├── 01_char.png ... NN_char.png    各キャラの RGBA (元ページサイズ、キャラ以外は透明)
│   └── stacked.png                    bg + 全キャラを重ねた検証用 RGB (≒ clean_page.png)
└── panels/
    ├── panel_01/
    │   ├── panel.png                  clean_page をフレーム bbox でクロップ (RGB)
    │   ├── bg.png                     background をフレーム bbox でクロップ (RGBA)
    │   ├── char_01.png ...            このコマ所属キャラを panel 座標にクロップ (RGBA)
    │   └── composite.png              bg + chars 合成した検証用 (≒ panel.png)
    └── panel_NN/...
```

### 使い分け

| 目的 | 使うファイル |
|---|---|
| フキダシ無しページを 1 枚で見る | `clean_page.png` |
| ページ全体に PSD 的にキャラを配置 | `layers/00_background.png` + `layers/0N_char.png` |
| コマ単位で素材として取り込み | `panels/panel_NN/{bg,char_NN}.png` |
| メタ情報のみ参照 | `manifest.json` |

`layers/0N_char.png` は **元ページ全体の座標系** で、キャラのいる部分以外は透明。
そのまま `00_background.png` の上にα合成すればよい。

`panels/panel_NN/char_NN.png` は **そのコマの bbox にクロップした座標系**。コマ単独で
扱う場合はこちら。

---

## manifest.json スキーマ

完全な例:

```json
{
  "version": 1,
  "schema": "mangafarm.manga-layerize/v1",
  "page": {
    "width": 832,
    "height": 1184,
    "source_filename": "sample.png"
  },
  "files": {
    "clean_page": "clean_page.png",
    "background": "layers/00_background.png",
    "stacked":    "layers/stacked.png"
  },

  "detections": [
    { "label": 2, "class_name": "frame", "score": 0.97, "bbox": [9.6, 7.9, 821.9, 348.2] },
    { "label": 0, "class_name": "body",  "score": 0.93, "bbox": [271.5, 793.9, 530.0, 1172.8] },
    { "label": 1, "class_name": "text",  "score": 0.88, "bbox": [620.0, 30.0, 800.0, 95.0] }
    /* ... 全 detection (body / text / frame) を score 込みで verbatim 保持 */
  ],

  "frames": [
    { "index": 1, "reading_order_rank": 1, "bbox": [9.6, 7.9, 821.9, 348.2] },
    { "index": 2, "reading_order_rank": 2, "bbox": [268.6, 358.2, 822.3, 758.3] },
    { "index": 3, "reading_order_rank": 3, "bbox": [9.1, 358.2, 258.3, 757.9] },
    { "index": 4, "reading_order_rank": 4, "bbox": [9.7, 767.9, 821.8, 1174.7] }
  ],

  "characters": [
    {
      "id": 1,
      "panel": 2,
      "body_bbox":      [489.0, 364.3, 714.6, 733.6],   /* toriniku が体として返した枠 */
      "alpha_bbox":     [494,  366,  713,  732],         /* RGBA レイヤーの α 矩形 */
      "alpha_centroid": [603, 549],                       /* α 重心 */
      "files": { "page_layer": "layers/01_char.png" }
    }
    /* 全キャラ */
  ],

  "frame_tree": {
    "column": [
      { "panel": 1, "size": 339.8, "divider": { "spacing": 9.9 } },
      {
        "row": [
          { "panel": 2, "size": 551.4, "divider": { "spacing": 10.4 } },
          { "panel": 3, "size": 249.2 }
        ],
        "size": 399.7,
        "divider": { "spacing": 10.5 }
      },
      { "panel": 4, "size": 405.6 }
    ],
    "padding": { "left": 0.011, "top": 0.007, "right": 0.013, "bottom": 0.009 }
  },

  "panels": [
    {
      "index": 1,
      "frame_bbox": [9.6, 7.9, 821.9, 348.2],
      "size": [812, 340],
      "files": {
        "panel":     "panels/panel_01/panel.png",
        "bg":        "panels/panel_01/bg.png",
        "composite": "panels/panel_01/composite.png"
      },
      "char_files":    ["panels/panel_01/char_01.png"],
      "character_ids": [4],                              /* characters[].id 参照 */
      "text_bboxes":   [[620.0, 30.0, 800.0, 95.0]]      /* このコマ内のフキダシ枠 */
    }
    /* 全パネル */
  ]
}
```

### 各フィールド

#### `page`
入力ページのサイズ。**全 bbox はこの座標系** (左上原点、float)。

#### `files`
ZIP 内パス。実装時にここを参照すれば、ファイル名規則に依存しないで取り出せる。

#### `detections`
toriniku/rt-detrv4 の生出力。クラス ID:

| label | class_name | 意味 |
|---|---|---|
| 0 | body | キャラの体 (持ち物は含まれないことが多い) |
| 1 | text | フキダシ + テキスト領域 |
| 2 | frame | コマ枠 |

`bbox` は `[x_min, y_min, x_max, y_max]` の float ピクセル座標。

#### `frames`
**読み順 (右→左、上→下) 済み**。`index` も `reading_order_rank` も 1-based。
`detections` の中の label=2 を読み順ソートしたもの。

#### `characters`
- `id` は 1-based、`layers/0N_char.png` の N と一致。
- `panel` は `panels[].index` への参照。
- `body_bbox`: toriniku の検出結果 (持ち物含まず)。
- `alpha_bbox`: 実際の RGBA 不透明領域。**持ち物・帽子なども含めてキャラの実輪郭**。
  この差分が「toriniku は体しか取らないが SAM3 は持ち物まで取った」結果。
- `alpha_centroid`: ユニーク識別とパネル所属判定に使われた重心。

#### `panels`
- `index` は読み順。
- `frame_bbox` は `frames[].bbox` と同じものを再掲。
- `character_ids` がそのコマに属するキャラの id 配列 (空の場合あり)。
- `text_bboxes` がそのコマに属するフキダシ bbox の配列 (空の場合あり)。フキダシ
  ベクトル化用の元データ。

#### `frame_tree`

FramePlanner の `FrameElement.compile()` に **そのまま渡せる** 再帰 markUp。

- 内部ノード: `{ row | column: [...children], size, divider? }`
  - `row` = 横分割 (子は **右→左** の漫画読み順)
  - `column` = 縦分割 (子は上→下)
- 葉ノード: `{ panel: <1-based frame index>, size, divider? }`
  - `panel` フィールドは **FramePlanner の独自メタ**。`FrameElement.compile` は
    無視するので markUp として安全。インポート側がどのコマに何の素材を入れるかの
    紐付けに使う。
- `size` は **兄弟間の相対重み**。ピクセル単位で入れてあるが正規化はしてない
  (FrameElement 内部で勝手に正規化される)。
- `divider.spacing` は **次の兄弟までのガター幅**を `size` と同じ単位 (px) で
  入れてある。最後の子には付かない。FrameElement の物理レイアウト時に
  `child.rawSize + child.divider.spacing` の比例配分で展開される。
- ルートノードのみ `padding: { left, top, right, bottom }` を持つ場合がある。
  各値は `page_size` に対する **0-1 の割合**。frames の外接矩形より外側の余白
  (ページの上下左右の白地) を表す。`FrameElement.compile` がこれを `cornerOffsets`
  に変換する。

##### 推論アルゴリズムと既知の限界

サービス側は **toriniku の frame bbox を再帰的に水平/垂直 cut で分割するだけ**
(LLM 不使用)。Manhattan 直交コマ割り (4-koma, 田の字, 1+横並列+1, L字 など) は
ほぼ完璧。一方:

- **斜め分割 / トラペゾイド**: `cornerOffsets` や `divider.slant` は **設定されない**。
  検出時点で bbox が axis-aligned 矩形に丸められているので情報自体が無い。
  必要なら FramePlanner 側で手作業 / 別ロジックで足す。
- **不分離レイアウト**: どの軸でも cut できない場合 (フレーム同士が両軸で重なる
  異形コマ) は fallback として **読み順の flat column** に展開され、その親に
  `_unsplittable: true` フラグが付く。実マンガでは稀だが見かけたら手修正前提。

### 不変条件 (実装側が前提にしてよい)

1. `characters[i].id == i + 1` (1-based 連番、欠番なし)
2. `frames[i].index == i + 1` (読み順並び済)
3. `panels[i].index == i + 1`
4. `panels[i].frame_bbox == frames[i].bbox`
5. `characters` で `panel` が同じものたちは、対応する `panels[k].character_ids` に
   全部入っている (双方向参照)
6. `layers/<NN>_char.png` の RGBA を `00_background.png` の上に重ねれば、その領域は
   `stacked.png` (≒ `clean_page.png`) と一致する
7. `frame_tree` の葉に出現する `panel` 値は `frames[].index` のいずれかと一致し、
   各 `frames[].index` はちょうど 1 回ずつ葉に出現する (欠落・重複なし)

---

## 実装フロー (推奨)

### UI 全体像

```
[FramePlanner エディタ]
  ↓ ユーザがページを選んで「レイヤーに分解」ボタン
[POST /api/manga-layerize/request {image: PNG}]
  ↓ jobId
[進捗ダイアログ表示]
  ↓ /status をポーリング (3 秒間隔)
  ├ status: completed → [GET /result] → ZIP DL
  │                       ↓ JSZip 等で解凍
  │                       ↓ manifest.json をパース
  │                       ↓ 各 PNG を Blob/ImageBitmap として保持
  │                       ↓ FramePlanner の素材ストアに投入
  │                       ↓ 完了モーダル表示
  └ status: failed     → エラー表示 + リトライ/中断オプション
```

### サンプル (TypeScript、フレームワーク非依存)

```ts
import JSZip from 'jszip';

export interface LayerizeManifest {
  version: number;
  schema: string;
  page: { width: number; height: number; source_filename: string | null };
  files: { clean_page: string; background: string; stacked: string };
  detections: Array<{
    label: 0 | 1 | 2;
    class_name: 'body' | 'text' | 'frame';
    score: number;
    bbox: [number, number, number, number];
  }>;
  frames: Array<{ index: number; reading_order_rank: number; bbox: [number, number, number, number] }>;
  characters: Array<{
    id: number;
    panel: number | null;
    body_bbox: [number, number, number, number] | null;
    alpha_bbox: [number, number, number, number] | null;
    alpha_centroid: [number, number] | null;
    files: { page_layer: string };
  }>;
  panels: Array<{
    index: number;
    frame_bbox: [number, number, number, number];
    size: [number, number];
    files: { panel: string; bg: string; composite: string };
    char_files: string[];
    character_ids: number[];
    text_bboxes: Array<[number, number, number, number]>;
  }>;
}

export interface LayerizeResult {
  manifest: LayerizeManifest;
  /** 解凍済の各ファイル (Blob)。manifest 内のパスをキーにアクセスできる。 */
  files: Map<string, Blob>;
}

const BASE = 'https://mangafarm.example.com';   // or http://localhost:5175 in dev

export async function startLayerize(image: Blob, sourceRef?: string): Promise<string> {
  const fd = new FormData();
  fd.append('image', image, 'page.png');
  if (sourceRef) fd.append('sourceRef', sourceRef);
  const res = await fetch(`${BASE}/api/manga-layerize/request`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  });
  if (res.status === 401) throw new Error('not logged in');
  if (res.status === 402) throw new Error('insufficient feathral');
  if (!res.ok) throw new Error(`request failed: HTTP ${res.status}`);
  const { jobId } = await res.json() as { jobId: string };
  return jobId;
}

export async function pollLayerize(jobId: string, signal?: AbortSignal): Promise<void> {
  for (;;) {
    if (signal?.aborted) throw new Error('aborted');
    const res = await fetch(`${BASE}/api/manga-layerize/status/${jobId}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`status failed: HTTP ${res.status}`);
    const j = await res.json() as { status: 'pending' | 'processing' | 'completed' | 'failed'; errorMessage?: string };
    if (j.status === 'completed') return;
    if (j.status === 'failed') throw new Error(j.errorMessage ?? 'failed');
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export async function fetchLayerizeResult(jobId: string): Promise<LayerizeResult> {
  const res = await fetch(`${BASE}/api/manga-layerize/result/${jobId}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`result failed: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const manifestText = await zip.file('manifest.json')!.async('string');
  const manifest: LayerizeManifest = JSON.parse(manifestText);

  const files = new Map<string, Blob>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    files.set(path, await entry.async('blob'));
  }
  return { manifest, files };
}

// 一気通貫
export async function layerizePage(image: Blob, sourceRef?: string): Promise<LayerizeResult> {
  const jobId = await startLayerize(image, sourceRef);
  await pollLayerize(jobId);
  return await fetchLayerizeResult(jobId);
}
```

### 取り込み時のヒント

#### キャラを 1 体素材として取り込む
```ts
const char = result.manifest.characters[0];
const blob = result.files.get(char.files.page_layer);  // 元ページサイズの RGBA
// blob から ImageBitmap 作って FramePlanner の素材に
const bitmap = await createImageBitmap(blob!);
```

#### コマ単位で取り込む
```ts
const panel = result.manifest.panels[0];
const bg = result.files.get(panel.files.bg)!;          // panel サイズの RGBA bg
const charsInPanel = panel.char_files.map((p) => result.files.get(p)!);
// FramePlanner で「panel.frame_bbox の位置に合成 RGBA を配置」する
```

#### フキダシ位置を再現
```ts
for (const panel of result.manifest.panels) {
  for (const tb of panel.text_bboxes) {
    // tb はページ全体座標。panel 座標に変換するなら panel.frame_bbox を引く
    placeBubble({ pageBbox: tb, panel: panel.index });
  }
}
```

#### `frame_tree` を FrameElement にコンパイル
```ts
import { FrameElement } from '$lib/layeredCanvas/dataModels/frameTree';

// 1) markUp -> FrameElement
const frameTree = result.manifest.frame_tree;
const root = FrameElement.compile(frameTree);

// 2) 葉ノードに素材を流し込む
//    `panel` フィールドはコンパイル後も markUp 元データから辿れないので、
//    再帰的に walk しながら frame_tree 側と zip して埋める。
function attachLeafContent(
  el: FrameElement,
  node: any,
  manifest: LayerizeManifest,
  files: Map<string, Blob>,
) {
  if (!el.direction) {
    // leaf
    const panelIdx = node.panel as number;
    const panel = manifest.panels.find(p => p.index === panelIdx)!;
    // bg を入れる例 (panel.files.bg は panel 座標 RGBA)
    const blob = files.get(panel.files.bg)!;
    // ここで el.filmStack に Film(bg blob) を push するなど…
    // (FramePlanner 内部 API は割愛)
    return;
  }
  const childMarks = node.row ?? node.column;
  for (let i = 0; i < el.children.length; i++) {
    attachLeafContent(el.children[i], childMarks[i], manifest, files);
  }
}

attachLeafContent(root, frameTree, result.manifest, result.files);
```

> 葉ノードに「`bg` を入れる / 各 `character_ids` を別レイヤーで入れる / `text_bboxes`
> を吹き出しに変換する」のどれをやるかは FramePlanner 側の編集モードに依存するので、
> 上のサンプルは骨格だけ。

---

## エラー処理の指針

### 一過性
- 502 (Worker 連携): 数秒置いてリトライ。3 回失敗で諦める。
- ネットワーク全般: ユーザに「再試行」ボタンを出す。

### 入力エラー
- 413 (サイズ超過): 縮小して再送。
- 415 (PNG 以外): canvas にレンダリングして PNG エクスポート。
- 422: API スキーマ違反。コード bug の可能性大、Sentry 行き。

### 認可・課金
- 401: ログインモーダル。
- 402: Feathral 残高不足モーダル + Spryt 購入導線。
- 403: 「他人のジョブにアクセスしようとした」= バグ or データ不整合。

### ジョブ失敗
- `/status` で `failed` が返ったら `errorMessage` を表示。
- `Abandoned (timeout)` は 5 分経過した自動失敗。Worker / fal.ai 側のトラブルが原因の
  ことが多い。再試行を促す。

---

## ローカル開発時のセットアップ

FramePlanner (`https://frameplanner.example.local:3000`) は HTTPS で立つので、
MangaFarm 側も **HTTPS で立てる必要**がある (HTTP だと mixed content でブラウザに
ブロックされ、サーバまで届かない)。

### 必要なもの一式

1. **MangaFarm SvelteKit (HTTPS)** — `https://example.local:5174` で API を提供
2. **manga-layerize Worker** — `127.0.0.1:8788` で R2 アップロード / Workflow 起動
3. **FramePlanner エディタ (HTTPS)** — `https://frameplanner.example.local:3000`

### 初回セットアップ (1 回だけ)

#### a. mkcert 証明書を `example.local` 用に発行

mkcert の CA は **Windows 側で `mkcert -install` 済み**であることが前提
(WSL の Chrome は Windows 側のトラストストアを参照)。

```bash
cd MangaFarm
# Windows 版 mkcert で発行 (古い CA = ブラウザ信頼済 CA で署名するため)
/mnt/c/ProgramData/chocolatey/bin/mkcert.exe \
  -cert-file example.local.pem -key-file example.local-key.pem \
  example.local "*.example.local"
```

WSL 内 mkcert で生成すると別 CA で署名されてしまい、Chrome が
`ERR_CERT_AUTHORITY_INVALID` で蹴る。**Windows 側 mkcert を使うこと**。

cert / key は `.gitignore` 済 (`*.pem`)。

#### b. MangaFarm `.env` を Worker ローカル向きに

```
MANGA_LAYERIZE_WORKER_URL=http://127.0.0.1:8788
MANGA_LAYERIZE_WORKER_SECRET=local-dev-secret  # .dev.vars と同じ値
CHARGE_ENABLED=false
```

#### c. Worker の `.dev.vars`

```bash
cd MangaFarm/workers/manga-layerize
cp .dev.vars.example .dev.vars
# .dev.vars に FAL_KEY と WORKER_SECRET=local-dev-secret を埋める
```

### 起動 (毎回)

ターミナル 3 枚:

```bash
# Terminal 1: MangaFarm SvelteKit (HTTPS)
cd MangaFarm
npm run dev-https              # https://example.local:5174

# Terminal 2: manga-layerize Worker
cd MangaFarm
npm run manga-layerize:dev     # http://127.0.0.1:8788

# Terminal 3: FramePlanner
cd FramePlanner2
npm run dev                    # https://frameplanner.example.local:3000
```

`npm run dev-https` (HTTPS) を使わないと FramePlanner からの cross-origin fetch が
mixed content でブロックされる。HTTP の `npm run dev` は Stripe webhook など他用途用。

### CORS / CSRF

FramePlanner は `*.example.local` の別サブドメインから cross-origin で API を叩くため、
MangaFarm 側で以下が設定済:

- **`svelte.config.js`**: `kit.csrf.checkOrigin = false`
  SvelteKit 標準の同一オリジン強制 (cross-origin POST → 403) を無効化。
- **`hooks.server.ts`**:
  - `/api/*` への OPTIONS preflight に応答 (port 5174 から見て CORS preflight)
  - `/api/*` レスポンスに `Access-Control-Allow-Origin` / `-Credentials: true` を付与
  - 状態変更系メソッド (POST/PUT/PATCH/DELETE) で Origin が `CORS_ALLOWED_DOMAINS`
    にない cross-origin 呼び出しを 403 で蹴る (CSRF 保護の自前代替)
  - 許可ドメイン: `example.local`, `manga-farm.online`, `mangafarm.pages.dev`,
    `pages.dev` のいずれかとサブドメイン

新しい cross-origin クライアントを足すときは `CORS_ALLOWED_DOMAINS` に追記する。

### 動作確認手順 (3 段階)

実装に入る前に / 入った後に手元で挙動を見たい時のレシピ。

#### 段階 1: Modal エンドポイント単体 (5 分)

サービスの最深層がそもそも動いてるかを確認。サンプル PNG → flux2-edit → SAM3
→ postprocess → group_panels の流れを Python から直接叩く:

```bash
cd Modal/MangaDetect
.venv/bin/python smoke_test_endpoints.py
```

成功すると `_smoke_layered.zip` が生成され、中身 26 ファイル + manifest.json が
出力される。manifest 内の characters / panels / detections が想定通りか確認できる。

#### 段階 2: Cloudflare Worker 単体 (SvelteKit / 認証スキップ、curl で検証)

Worker から先 (Worker → fal.ai → Modal → R2) のフルパイプラインを SvelteKit を
立ち上げずに確認したい時。`WORKER_SECRET` を Bearer に直叩きするので **本番では
やらない手順**。

```bash
cd MangaFarm
npm run manga-layerize:dev   # = workers/manga-layerize で wrangler dev --port 8788
# .dev.vars に FAL_KEY と WORKER_SECRET=local-dev-secret を設定済前提
```

別ターミナルから:

```bash
JOBID=$(uuidgen)
KEY="manga-layerize/input/${JOBID}.png"

# 1) PNG を Worker 経由で R2 に PUT
curl -X PUT \
  -H "Authorization: Bearer local-dev-secret" \
  -H "Content-Type: image/png" \
  --data-binary @/path/to/sample.png \
  "http://localhost:8788/upload-to-r2?key=$(printf '%s' "$KEY" | jq -sRr @uri)"

# 2) Workflow 起動 (callback は Worker 内蔵の /test-cb に向ける)
curl -X POST \
  -H "Authorization: Bearer local-dev-secret" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\":\"$JOBID\",\"r2KeyInput\":\"$KEY\",\"callbackUrl\":\"http://localhost:8788/test-cb\",\"callbackToken\":\"tok\"}" \
  http://localhost:8788/start-workflow

# 3) ポーリング (workflowStatus.status が 'complete' になるまで)
curl "http://localhost:8788/workflow-status?id=$JOBID" | jq

# 4) 完了したら ZIP を取得
curl -H "Authorization: Bearer local-dev-secret" \
  "http://localhost:8788/output-url?key=manga-layerize/output/${JOBID}.zip" \
  -o out.zip
unzip -l out.zip
unzip -p out.zip manifest.json | jq '.characters | length'
```

3〜5 分で `complete`、ZIP は 5〜30 MB 程度。

#### 段階 3: SvelteKit + Worker フル E2E (本来の経路)

Worker 単体 + MangaFarm SvelteKit + ブラウザログイン session の組み合わせで、
本番と同じ経路を辿る。

```bash
# Terminal 1
cd MangaFarm && npm run manga-layerize:dev    # http://127.0.0.1:8788
# Terminal 2
cd MangaFarm && npm run dev-https             # https://example.local:5174
```

ブラウザで MangaFarm のローカル URL にログイン → DevTools console で:

```js
const blob = await (await fetch('/sample.png')).blob();
const fd = new FormData();
fd.append('image', blob, 'page.png');
fd.append('sourceRef', 'devtools-test');

// 1) ジョブ起動
const r = await fetch('/api/manga-layerize/request', {
  method: 'POST', body: fd, credentials: 'include',
});
const { jobId } = await r.json();
console.log('jobId:', jobId);

// 2) ポーリング
let s; while ((s = await (await fetch(`/api/manga-layerize/status/${jobId}`,
  { credentials: 'include' })).json()).status === 'processing') {
  await new Promise(r => setTimeout(r, 3000));
  console.log(s.status);
}

// 3) ZIP 取得
const zip = await (await fetch(`/api/manga-layerize/result/${jobId}`,
  { credentials: 'include' })).blob();
console.log('zip size:', zip.size);

// 必要なら DL
const a = document.createElement('a');
a.href = URL.createObjectURL(zip);
a.download = `${jobId}.zip`;
a.click();
```

これで本番想定のフロー全部 (auth → request → poll → result → unzip) を再現できる。

#### コスト
- 段階 1, 2, 3 いずれも fal.ai に **実呼び出し** が走るので 1 回 ~$0.10 の実費が発生する。
  繰り返しテストする時は注意。
- Modal CPU は誤差 (1 ジョブ 1 円未満)。
- ローカル R2 シミュレータ + Workflow ストレージは無料。

---

## 既知の限界 / 将来の拡張

- **入力 1 ページ単位のみ**。複数ページバッチは未対応 (FramePlanner 側で並列に投げれば
  3 並列くらいまでなら問題なく動くが、課金は 1 ページ単位)。
- **PNG 以外不可**。JPEG / WebP は将来検討。
- **持ち物検出が完全ではない**。持っているものが体から離れている場合、抜け落ちる
  ことがある (例: 振り上げた帽子のフサフサが部分欠落、振っている剣の先端が切れる、等)。
  この場合は character_id を再設定して FramePlanner 側で手作業修正してもらうしかない。
- **フキダシ自体は ZIP 内に画像として残らない**。`text_bboxes` だけ。**フキダシは
  FramePlanner のベクトル吹き出しで再生成する想定**。ベクトル吹き出しが要らないなら
  `clean_page.png` ではなく入力元画像を使う方が早い。
- **同一ページで複数キャラが重なっている**ケース: 重なり順は不定。`alpha_centroid` の
  Y 座標で sort して下から重ねるなどヒューリスティックを FramePlanner 側で。

---

## 参考資料 (サービス側ドキュメント)

実装で困ったらこちら:

- [`MangaFarm/documents/manga-layerize-design.md`](../../MangaFarm/documents/manga-layerize-design.md) — サービス全体設計 (アーキテクチャ・I/O 仕様の権威ある情報源)
- [`MangaFarm/documents/mangafarm-charge-design.md`](../../MangaFarm/documents/mangafarm-charge-design.md) — 課金システム設計
- [`Modal/MangaDetect/WORKFLOW.md`](../../Modal/MangaDetect/WORKFLOW.md) — 内部パイプライン詳細 (画像処理アルゴリズム、結果の質や限界を理解したい時に)
