# FramePlanner i18n対応 残作業覚書

最終更新: 2025-01-06

## 進捗サマリー
- Phase 1 (編集系): ✅ 完了 (2025-01-06)
- Phase 2 (生成系): ✅ 完了 (2025-01-06)
- Phase 3 (拡張機能): ✅ 完了 (2025-01-06)

## 完了済みコンポーネント ✅

### 基盤システム
- [x] svelte-i18nセットアップ
- [x] 翻訳ファイル構造 (`src/locales/ja.json`, `en.json`)
- [x] 言語設定ストア (`src/stores/i18n.ts`)
- [x] 言語切り替えUI (`src/toolbar/LanguageSwitcher.svelte`)

### メインUI
- [x] **App.svelte** - i18n初期化
- [x] **ToolBar.svelte** - undo/redo、メニュー、サインイン/アウト
- [x] **Root Buttons** - 全9個のボタン完了
  - NewBookButton, CabinetButton, DownloadButton, AboutButton
  - MaterialBucketButton, BellButton, RulerButton, VideoButton, PostButton

### ファイルシステム
- [x] **FileManager** - 全コンポーネント完了
  - FileManagerRoot, FileManagerFolder, FileManagerFile
  - NewStorageWizard
- [x] **Transfer** - データエクスポート/インポート
  - Dump.svelte, Undump.svelte

### Phase 1 編集系 (完了)
- [x] **ControlPanel** - 紙サイズ、拡大率設定
- [x] **BubbleInspector** - フキダシ編集パネル (全機能)
- [x] **FrameInspector** - フレーム編集パネル (全機能)
  - FrameInspector.svelte, FilmEffect.svelte, FilmListItem.svelte, frameInspectorStore.ts

### Phase 2 生成系 (完了) ✅

---

## 未対応コンポーネント 🚧

### 1. 編集系コンポーネント (高優先度) ✅

#### **ControlPanel** (`src/controlpanel/ControlPanel.svelte`) ✅
- [x] 紙のサイズ設定
- [x] 拡大率、進行方向設定
- [x] カスタムサイズ入力

#### **BookEditor系** (`src/bookeditor/`)
- **BubbleInspector** - フキダシ編集パネル ✅
  - [x] フォント選択、サイズ、色設定
  - [x] シェイプ選択、テンプレート
- **FrameInspector** - フレーム編集パネル ✅
  - [x] フィルム効果、レイヤー操作
  - [x] フレーム分割、配置調整
- **PageInspector** - ページ設定パネル
  - ページサイズ、色設定
- **TemplateChooser** - テンプレート選択

### 2. 生成系コンポーネント (中優先度)

#### **ImageGenerator系** (`src/generator/`) ✅
- [x] **ImageGenerator** - AI画像生成メイン
- [x] **BatchImaging** - バッチ生成  
- [x] **VideoGenerator** - 動画生成
- [x] **Upscaler** - 画像アップスケール
- [x] **ImageGeneratorCloud** - クラウド画像生成
- [x] **ImageMaskDialog** - マスク作成ダイアログ
- [x] **ImagingProgressBar** - 進捗表示

#### **素材管理系** ✅  
- [x] **MaterialBucket** (`src/materialBucket/`) - 素材バケット
- [x] **BubbleBucket** (`src/bubbleBucket/`) - フキダシバケット (翻訳不要)
- [x] **Gallery** (`src/gallery/`) - ギャラリー表示

### Phase 3 拡張機能 (完了) ✅

#### **Notebook系** (`src/notebook/`) ✅
- [x] **NotebookTextarea** - ノート入力エリア (4 strings)
- [x] **NotebookCharacter** - キャラクター管理 (5 strings)
- [x] **NotebookCharacterList** - キャラクターリスト (5 strings)
- [x] **Roster** - 名簿機能 (6 strings)
- [x] **NotebookManual** - 創作ノートメイン (50+ strings)

#### **Publication系** (`src/publication/`)
- **Publication** - 出版設定
- **SocialCard** - SNS投稿カード

### 4. ユーティリティ系 (低優先度)

#### **About系** (`src/about/`)
- **About** - アバウトダイアログ
- **StructureTree** - 構造ツリー表示

#### **Viewer系**
- **VideoMaker** (`src/videomaker/`) - 動画作成
- **MangaView** (`src/mangaview/`) - マンガビューア

#### **Utils** (`src/utils/`)
- 各種ダイアログ、ユーティリティコンポーネント
- エラーメッセージ、確認ダイアログ

---

## 翻訳ファイル拡張予定

### 追加済みセクション ✅

```json
{
  "editor": {
    "paperSize": "紙のサイズ",
    "custom": "カスタム",
    "square": "正方形",
    "portrait": "縦長",
    "landscape": "横長",
    "direction": "進行方向",
    "wrap": "折返し",
    "scale": "拡大率"
  },
  "bubble": {
    "text": "テキスト",
    "fontSize": "フォントサイズ",
    "fontColor": "フォント色",
    "outlineWidth": "フチの太さ",
    "backgroundColor": "フキダシ背景色"
  },
  "frame": {
    "visibility": "表示",
    "visible": "表示",
    "hidden": "非表示"
  }
}
```

### 追加予定セクション

```json
{
  "generator": {
    "generateImage": "画像生成",
    "batchGeneration": "バッチ生成",
    "prompt": "プロンプト",
    "negativePrompt": "ネガティブプロンプト",
    "steps": "ステップ数",
    "cfg": "CFGスケール"
  },
  "notebook": {
    "character": "キャラクター",
    "story": "ストーリー",
    "memo": "メモ",
    "addCharacter": "キャラクター追加"
  },
  "dialogs": {
    "confirm": "確認",
    "cancel": "キャンセル",
    "ok": "OK",
    "error": "エラー",
    "warning": "警告",
    "success": "成功"
  }
}
```

---

## 実装ガイドライン

### 1. 基本パターン
```svelte
<script>
import { _ } from 'svelte-i18n';
</script>

<button>{$_('ui.buttonName')}</button>
<p>{$_('messages.description')}</p>
```

### 2. 動的な文字列
```svelte
<!-- 改行を含む文字列 -->
<p>{@html $_('description').replace(/\\n/g, '<br>')}</p>

<!-- 変数を含む文字列 -->
<p>{$_('message.fileCount', { values: { count: fileCount } })}</p>
```

### 3. ツールチップ・ヒント
```svelte
<button use:toolTip={$_('tooltips.saveFile')}>Save</button>
```

### 4. コンディショナル表示
```svelte
{#if condition}
  <span>{$_('status.online')}</span>
{:else}
  <span>{$_('status.offline')}</span>
{/if}
```

---

## 優先順位付け戦略

### Phase 1: 編集系 (即座に影響大) ✅ 完了
1. ControlPanel - 基本設定 ✅
2. BubbleInspector - フキダシ編集 ✅
3. FrameInspector - フレーム編集 ✅

### Phase 2: 生成系 (使用頻度高)
1. ImageGenerator - AI画像生成
2. MaterialBucket - 素材管理
3. Gallery - ギャラリー

### Phase 3: 拡張機能 (完成度向上)
1. Notebook - 創作ノート
2. Publication - 出版機能
3. About/Help - 情報系

---

## 注意事項

### 1. フォント関連
- 日本語フォント名 (`源暎エムゴ`など) の英語表記検討
- フォント選択UIでの表示方法

### 2. 専門用語
- マンガ制作用語の英訳統一
- UI操作用語の一貫性

### 3. 画像リソース
- 日本語が含まれるスクリーンショット等の英語版作成
- アイコンやイラスト内のテキスト

### 4. 外部サービス連携
- AI生成サービスのエラーメッセージ
- クラウドストレージの状態表示

---

## 翻訳品質チェックリスト

- [ ] 全ての user-facing テキストが翻訳されている
- [ ] 翻訳キーの命名が一貫している
- [ ] 改行やフォーマットが適切に処理されている
- [ ] 動的コンテンツ（ファイル名、数値等）が正しく表示される
- [ ] エラーメッセージが分かりやすい
- [ ] ツールチップ・ヒントが翻訳されている
- [ ] モーダル・ダイアログが完全に翻訳されている
- [ ] 言語切り替え後のリロードで設定が保持される

---

*このドキュメントは実装進捗に応じて更新してください。*