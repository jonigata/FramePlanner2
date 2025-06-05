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

#### **Publication系** (`src/publication/`) ✅
- [x] **Publication** - 出版設定 (10 strings)
- [x] **SocialCard** - SNS投稿カード (4 strings)

### Phase 5 About系 (完了) ✅

#### **About系** (`src/about/`) ✅
- [x] **About** - アバウトダイアログ (コンポーネント分離方式)
  - [x] **AboutContentJa** - 日本語版コンテンツ (100+ strings)
  - [x] **AboutContentEn** - 英語版コンテンツ (100+ strings)
- [x] **StructureTree** - 構造ツリー表示 (2 strings)

### Phase 6 Viewer/Utils系 (進行中) 🚧

#### **Viewer系** ✅
- [x] **VideoMaker** (`src/videomaker/`) - 動画作成 (6 strings)
- [x] **MangaView** (`src/mangaview/`) - マンガビューア (1 string)

#### **Utils** (`src/utils/`) 🚧
- [x] **ConfirmDialog** - 確認ダイアログ (5 strings)
- [ ] **TextEditDialog** - テキスト編集ダイアログ
- [ ] **InpaintDialog** - インペイントダイアログ  
- [ ] **ImageMaskDialog** - マスクダイアログ
- [ ] **AuthForm** - 認証フォーム
- [ ] **FileBrowser** - ファイルブラウザ
- [ ] その他のユーティリティコンポーネント

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