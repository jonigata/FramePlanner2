# NDJSON v2 仕様書（改訂版）

本書は **IndexedDBFileSystem.dump / FSAFileSystem.dump → undump** のパイプラインで  
「文字列かオブジェクトか」を正確に保持しつつ、  
旧フォーマット（v1）との後方互換 *（読み込みのみ）* を維持するための  
**NDJSON v2** 仕様を定義する。

---

## 1. レコード共通ヘッダ

| フィールド | 型 | 必須 | 説明 |
|------------|----|------|------|
| `v` | `number` | ◎ | フォーマットバージョン。`2` 固定。<br>v フィールドが無い行は **v1** とみなす。 |
| `id` | `string` | ◎ | NodeId (`ulid()`) |
| `type` | `"file"` / `"folder"` | ◎ | ノード種別 |
| その他 | _任意_ |   | 既存 dump のフィールド（`children` など）をそのまま保持 |

```jsonc
// 例: フォルダノード
{
  "v": 2,
  "id": "01HV...",
  "type": "folder",
  "children": [ ["01HX...", "page1", "01HY..."] ],
  "attributes": { "title": "Chapter 1" }
}
```

---

## 2. `file` ノードの `content` 表現

| 元データ型 | v2 での `content` | 説明 |
|------------|------------------|------|
| 文字列 | `{ "__str__": "<文字列>" }` | 文字列を明示的にラップ |
| オブジェクト<br>(Blob ラッピング含む) | オブジェクトそのまま | 既存 `serializeBlobs()` / `externalizeBlobsInObject()` の出力を使用 |

> **NOTE**  
> Blob ラッピング `{ "__blob__": true, data: <dataURL>, type: <mime> }` は  
> オブジェクト内部に再帰的に現れる前提のため、トップレベルの型判定には使用しない。

```jsonc
// 文字列ファイル
{
  "v": 2,
  "id": "01HW...",
  "type": "file",
  "content": { "__str__": "Hello, world!" }
}

// オブジェクトファイル（再帰的な Blob ラップ含む）
{
  "v": 2,
  "id": "01HX...",
  "type": "file",
  "content": {
    "a": 1,
    "img": { "__blob__": true, "data": "data:image/png;base64,...", "type": "image/png" }
  }
}
```

---

## 3. ダンプ実装変更（IndexedDB / FSA 共通）

- どちらのバックエンドも、v2 では下記のように `content` をラップして出力する。

```ts
item.v = 2;
if (typeof node.content === 'string') {
  item.content = { __str__: node.content };
} else {
  item.content = await serializeBlobs(node.content); // 既存処理
}
```
FSA 側は `externalizeBlobsInObject()` など既存の Blob ラッピング関数を利用。

---

## 4. undump 実装の注意点

### 4.1 FSAFileSystem.undump

- v フィールドがない行 → **v1** とみなして既存処理。
- v==2 行 → レコードをそのまま DB へ保存。`content` のラップは展開せず保存。

### 4.2 IndexedDBFileSystem.undump

- v フィールドがない行 → **v1** とみなして既存処理。
- v==2 行 →  
  - `content` が `{ "__str__": ... }` ならアンラップして「純粋な文字列」として保存  
  - それ以外は `deserializeBlobs()` で Blob 展開しつつそのまま保存

```ts
const raw = item.content;
let stored;
if (raw && typeof raw === 'object' && '__str__' in raw) {
  stored = raw.__str__;         // 純粋な文字列として保存
} else {
  stored = await deserializeBlobs(raw);  // 既存ロジック
}
await store.put({ id, type: 'file', content: stored });
```

---

## 5. FSAFile.read() の読み込みロジック

```ts
const c = file.inlineContent;
if (typeof c === 'string') {
  // = v1 レコード
  try { return JSON.parse(c); } catch { return c; }
}
if (c && typeof c === 'object' && '__str__' in c) {
  return c.__str__;                  // 文字列
}
return await internalizeBlobsInObject(c, blobStore); // オブジェクト (+ Blob 展開)
```

---

## 6. 互換性マトリクス

| dump 版 | undump 版 | 動作 |
|---------|----------|------|
| v1 | 現行 | ✅ 従来どおり |
| v1 | **v2 ローダ** | ✅ `v` 無し = v1 判定で従来ロジック |
| v2 | **v2 ローダ** | ✅ 本仕様に従い型保持 |
| v2 | 旧ローダ (v1) | △ `__str__` ラッパ付きオブジェクトとして読める。編集せず閲覧のみ可 |

---

## 7. 採用メリット

1. **型情報を厳密保持**  
   文字列／オブジェクトを誤判定なく round-trip 可能。
2. **実装コスト最小化**  
   既存の Blob ラッピング・再帰ロジックを流用。  
   追加はトップレベルラッパと `v` フィールドのみ。
3. **旧データ読み込み互換**  
   v フィールドの有無で分岐するだけなので旧ダンプは無改修で読める。
4. **将来拡張容易**  
   `v` を上げていくだけで追加メタを導入可能。

---

## 8. 今後の作業タスク

1. [`indexeddbFileSystem.dump()`](src/lib/filesystem/indexeddbFileSystem.ts:263)・[`fsaFileSystem.dump()`](src/lib/filesystem/fsaFileSystem.ts) に v2 ラップ処理を追加  
2. [`fsaFileSystem.undump()`](src/lib/filesystem/fsaFileSystem.ts) で v 判定分岐を実装  
3. [`indexeddbFileSystem.undump()`](src/lib/filesystem/indexeddbFileSystem.ts) で v2 レコードの `__str__` アンラップ保存を実装  
4. [`FSAFile.read()`](src/lib/filesystem/fsaFileSystem.ts:405) を上記ラッパ判定へ改修  
5. 単体テスト  
   - v1 → v2 undump 互換  
   - v2 → v2 round-trip  
   - 文字列／オブジェクト／Blob 混在ケース

---

ご確認ください。修正点・追記があればお知らせください。