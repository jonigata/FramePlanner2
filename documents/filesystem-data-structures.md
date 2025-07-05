# FramePlanner ファイルシステムの抽象データ構造

## 概要

FramePlannerのファイルシステムは、Unix/Linuxのinode構造に着想を得た抽象化レイヤーを実装しています。ノード（inode相当）とディレクトリエントリ（dentry相当）を分離することで、ハードリンクや効率的な名前変更を可能にしています。

## 中核となるデータ構造

### 1. Node（ノード）- inode相当

```
┌─────────────────────────┐
│         Node            │
├─────────────────────────┤
│ nodeId: NodeId          │  ← 一意の識別子（ULID）
│ type: 'file'|'folder'   │  ← ノードタイプ
└─────────────────────────┘
         ↑
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ File  │ │Folder │
├───────┤ ├───────┤
│content│ │children│
│blob   │ │attrs  │
│media  │ └───────┘
└───────┘
```

#### NodeIdの特徴
- **不変性**: 一度生成されたNodeIdは変更されない
- **一意性**: システム全体で重複しない（ULIDを使用）
- **型安全性**: TypeScriptのBranded Typeで型レベルの保証

### 2. Entry（エントリ）- dentry相当

```
Entry = [BindId, string, NodeId]
         │       │       │
         │       │       └─→ 実際のノードへの参照
         │       └─────────→ エントリ名（ファイル名）
         └─────────────────→ このエントリの識別子
```

### 3. ディレクトリ構造

```
┌──────────────────────────────────────┐
│         Folder Node                  │
│         nodeId: "folder1"            │
├──────────────────────────────────────┤
│ children: [                          │
│   ["bind1", "file.txt", "node1"],   │
│   ["bind2", "image.png", "node2"],  │
│   ["bind3", "link.txt", "node1"],   │ ← 同じnode1への別リンク
│ ]                                    │
└──────────────────────────────────────┘
```

## データ構造の関係図

```
                 FileSystem
                     │
    ┌────────────────┴────────────────┐
    │                                 │
Folders (Directory Structure)    Nodes (Content Storage)
    │                                 │
    ├─ Root Folder                    ├─ File Node 1
    │   ├─ Entry 1 ──────────────────┤
    │   ├─ Entry 2 ──────────────────├─ File Node 2
    │   └─ Entry 3 ──────────────────├─ Folder Node 3
    │                                 │
    └─ Folder Node 3                  └─ File Node 4
        ├─ Entry 4 ──────────────────┘
        └─ Entry 5 ──────────────────┐
                                     │
                              (Hard Link to Node 1)
```

## inode的な観点からの設計

### 1. ノードとリンクの分離

**Unix/Linux ファイルシステム**
```
inode ← dentry (ディレクトリエントリ)
```

**FramePlanner ファイルシステム**
```
Node ← Entry (BindId, name, NodeId)
```

### 2. ハードリンクのサポート

```
Folder A                    Folder B
    │                          │
    └─ ["bind1", "file.txt", "node123"]
                          │
                          └─ ["bind2", "hardlink.txt", "node123"]
                                              │
                                              ▼
                                         Node (id: "node123")
                                         content: "Hello World"
```

### 3. メタデータの階層

```
┌─────────────────────────────────────┐
│            Node Level               │
├─────────────────────────────────────┤
│ - nodeId (inode番号相当)            │
│ - type (file/folder)                │
│ - 基本的な属性                      │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│          Entry Level                │
├─────────────────────────────────────┤
│ - bindId (エントリ識別子)           │
│ - name (ファイル名)                 │
│ - parent-child関係                  │
└─────────────────────────────────────┘
```

## バックエンド実装での実現

### IndexedDB実装
```javascript
// ノードとエントリを統合した形で保存
{
  id: "node123",
  type: "folder",
  children: [
    ["bind1", "file.txt", "node456"],
    ["bind2", "subfolder", "node789"]
  ]
}
```

### SQLite実装（FSA/Supabase）
```sql
-- ノードテーブル（inode相当）
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,     -- NodeId
  type TEXT NOT NULL       -- 'file' or 'folder'
);

-- ディレクトリエントリテーブル（dentry相当）
CREATE TABLE children (
  parentId TEXT NOT NULL,  -- 親フォルダのNodeId
  bindId TEXT PRIMARY KEY, -- エントリID
  name TEXT NOT NULL,      -- エントリ名
  childId TEXT NOT NULL,   -- 子ノードのNodeId
  idx INTEGER              -- 表示順序
);
```

## 操作の実装

### 1. ファイル作成
```
1. 新しいNodeを作成（NodeId生成）
2. Entryを親フォルダに追加（BindId生成）
3. 両者をストレージに保存
```

### 2. 名前変更
```
1. Entryのnameフィールドのみを更新
2. Nodeは変更なし（効率的）
```

### 3. ハードリンク作成
```
1. 既存のNodeIdを参照
2. 新しいEntryを別フォルダに作成
3. 同じNodeIdを参照
```

### 4. 削除
```
- unlink: Entryのみ削除（他のリンクは残る）
- destroyNode: すべてのEntryとNode本体を削除
```

## まとめ

FramePlannerのファイルシステムは、以下の特徴を持つinode的な設計を採用しています：

1. **ノードとエントリの分離**: 柔軟なリンク管理
2. **ハードリンクサポート**: 同一ノードへの複数参照
3. **効率的な操作**: 名前変更やリンク操作が高速
4. **バックエンド抽象化**: 異なるストレージでも統一的なAPI
5. **型安全性**: TypeScriptのBranded Typeによる厳密な型管理

この設計により、様々なストレージバックエンド（ローカル/クラウド）に対して、一貫性のある高性能なファイルシステムを提供しています。