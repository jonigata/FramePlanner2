# ファイルシステム概要（AI向け要約）

## 基本設計
FramePlannerのファイルシステムは、Unix/Linuxのinode構造に着想を得た設計で、Node（inode相当）とEntry（dentry相当）を分離しています。

## 主要な型
- **NodeId**: ノードの一意識別子（ULID使用）
- **BindId**: ディレクトリエントリの識別子
- **Entry**: `[BindId, name, NodeId]` のタプル

## データ構造
- **Node**: すべてのファイル/フォルダの基底クラス
- **File**: コンテンツ（文字列、Blob、メディア）を保持
- **Folder**: 子要素のEntryリストと属性を保持

## バックエンド
1. **IndexedDB**: ブラウザローカルストレージ
2. **FSA**: File System Access API + SQLite
3. **Firebase**: Realtime Database + Storage
4. **Supabase**: PostgreSQL + Backblaze

## 特徴
- ハードリンクサポート（同一NodeIdへの複数Entry）
- 効率的な名前変更（Entryのみ更新）
- 統一API（すべてのバックエンドで同じインターフェース）

詳細: [アーキテクチャ](./filesystem-architecture.md) | [データ構造](./filesystem-data-structures.md)