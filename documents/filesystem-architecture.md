# FramePlanner ファイルシステムアーキテクチャ

## 概要

FramePlannerのファイルシステムモジュール（`src/lib/filesystem/`）は、複数のストレージバックエンドを統一的なAPIで扱うための抽象化レイヤーを提供します。ローカルストレージからクラウドストレージまで、様々な永続化戦略をサポートし、画像・動画などのメディアコンテンツの効率的な管理を実現しています。

## アーキテクチャ構成

### コアインターフェース

`fileSystem.ts`に定義される基本的な抽象化：

- **FileSystem**: すべてのファイルシステム実装の抽象基底クラス
- **Node**: ファイルとフォルダの共通基底クラス
- **File**: ファイルノードのインターフェース
- **Folder**: フォルダノードのインターフェース

### 主要な型定義

```typescript
type NodeType = 'file' | 'folder'
type NodeId = string & { __brand: 'NodeId' }  // ユニークなノード識別子
type BindId = string & { __brand: 'BindId' }  // フォルダ内のエントリー識別子
type Entry = [BindId, string, NodeId]          // [ID, 名前, ノードID]のタプル
type MediaResource = HTMLCanvasElement | HTMLVideoElement | RemoteMediaReference
```

## バックエンド実装

### 1. IndexedDBFileSystem (`indexeddbFileSystem.ts`)

ブラウザのIndexedDBを使用したローカルストレージ実装：

- **利点**: 完全なオフライン動作、高速なアクセス
- **機能**:
  - Blobのシリアライズ/デシリアライズ
  - NDJSONフォーマットでのダンプ/リストア
  - ブラウザのストレージ制限内での動作

### 2. FSAFileSystem (`fsaFileSystem.ts`)

File System Access APIを使用したローカルファイルシステム実装：

- **利点**: ローカルファイルシステムへの直接アクセス
- **機能**:
  - SQLiteベースのメタデータ管理（SqlJsAdapter使用）
  - BlobStoreによる大容量データの効率的な管理
  - ディレクトリピッカーによるフォルダ選択

### 3. FirebaseFileSystem (`firebaseFileSystem.ts`)

Firebase Realtime Databaseを使用したクラウドストレージ実装：

- **利点**: リアルタイム同期、マルチデバイス対応
- **機能**:
  - 共有（shares）とクラウド（cloud）の2つのモード
  - 匿名認証サポート
  - リアルタイムデータ同期

### 4. SupabaseFileSystem (`supabaseFileSystem.ts`)

Supabaseデータベースを使用したクラウドストレージ実装：

- **利点**: PostgreSQLベースの堅牢性、認証統合
- **機能**:
  - ユーザーごとの独立したストレージ
  - BackblazeContentStorageとの統合
  - SQLによる高度なクエリ機能

### 5. MockFileSystem (`mockFileSystem.ts`)

テスト用のメモリ内実装：

- **用途**: ユニットテスト、開発時のモック
- **機能**:
  - ファイルシステムAPIの完全なモック
  - JSON形式でのダンプ/リストア

## コンテンツストレージシステム

### ContentStorage インターフェース (`contentStorage.ts`)

メディアコンテンツの保存と読み込みを抽象化：

```typescript
interface ContentStorage {
  putBlob(blob: Blob): Promise<string>  // SHA1ハッシュを返す
  getBlob(sha: string): Promise<Blob | null>
  putCanvas(canvas: HTMLCanvasElement): Promise<string>
  getCanvas(sha: string): Promise<HTMLCanvasElement | null>
  putMediaResource(media: MediaResource): Promise<string>
  getMediaResource(sha: string): Promise<MediaResource | null>
}
```

### 実装

1. **BackblazeContentStorage** (`backblazeContentStorage.ts`)
   - Backblaze B2ストレージ使用
   - 暗号化サポート（AES-GCM）
   - 大容量ファイルの効率的な処理

2. **FirebaseContentStorage** (`firebaseContentStorage.ts`)
   - Firebase Storage使用
   - セキュリティルールによるアクセス制御

## 主要な機能とパターン

### Watcherパターン

フォルダの変更を監視するオブザーバーパターン：

```typescript
interface Watcher {
  onInsert?: (bindId: BindId, name: string, node: Node) => void
  onDelete?: (bindId: BindId, name: string, nodeId: NodeId) => void
  onRename?: (bindId: BindId, oldName: string, newName: string) => void
}
```

### メディア変換 (`mediaConverter.ts`)

各種メディア形式の相互変換：

- HTMLCanvasElement ⇔ Blob (PNG/WebP)
- HTMLVideoElement ⇔ Blob
- RemoteMediaReference の処理
- DataURL変換サポート

### ダンプ/リストア機能

すべてのファイルシステム実装で利用可能：

```typescript
async dump(writer: WritableStreamDefaultWriter<Uint8Array>, 
          progress?: (phase: string, current: number, total: number) => void): Promise<void>

async restore(reader: ReadableStreamDefaultReader<Uint8Array>,
             progress?: (phase: string, current: number, total: number) => void): Promise<void>
```

## 使用例

### ファイルシステムの初期化

```typescript
// IndexedDBの場合
const fs = new IndexedDBFileSystem()
await fs.init('myDatabase')

// File System Access APIの場合
const handle = await window.showDirectoryPicker()
const fs = new FSAFileSystem()
await fs.init(handle)

// Firebaseの場合
const fs = new FirebaseFileSystem()
await fs.init({ mode: 'cloud', prefix: 'myApp' })
```

### ファイルの作成と読み込み

```typescript
// ファイルの作成
const file = await fs.createFile(folderId, 'document.json')
await file.writeString(JSON.stringify({ data: 'example' }))

// ファイルの読み込み
const content = await file.readString()
const data = JSON.parse(content)
```

### メディアの保存

```typescript
// Canvasの保存
const canvas = document.createElement('canvas')
// ... canvasに描画 ...
await file.writeCanvas(canvas)

// Canvasの読み込み
const loadedCanvas = await file.readCanvas()
```

## 設計原則

1. **抽象化の徹底**: すべての実装が共通のインターフェースに従う
2. **非同期設計**: すべてのAPIがPromiseベース
3. **型安全性**: TypeScriptのブランド型による厳密な型チェック
4. **拡張性**: 新しいバックエンドの追加が容易
5. **ストリーミング**: 大容量データの効率的な処理
6. **エラーハンドリング**: 明確なエラー型と回復可能な設計

## まとめ

FramePlannerのファイルシステムモジュールは、アプリケーションの永続化ニーズに対して柔軟かつ拡張可能なソリューションを提供します。統一されたAPIにより、開発者は実装の詳細を意識することなく、様々なストレージバックエンドを活用できます。