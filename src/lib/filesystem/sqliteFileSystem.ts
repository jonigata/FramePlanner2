import type { NodeId, NodeType, BindId, Entry, RemoteMediaReference, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';

// SQLiteAdapter, BlobStore は後続で実装
// import { SQLiteAdapter } from './sqlite/SQLiteAdapter';
// import { BlobStore } from './sqlite/BlobStore';

export class FSAFileSystem extends FileSystem {
  // private sqlite: SQLiteAdapter;
  // private blobStore: BlobStore;

  constructor() {
    super();
    // this.sqlite = new SQLiteAdapter();
    // this.blobStore = new BlobStore();
  }

  async open(dirHandle: FileSystemDirectoryHandle): Promise<void> {
    // SQLiteAdapter/BlobStore初期化
  }

  async createFile(_type: string): Promise<File> {
    // ファイル作成
    throw new Error('Not implemented');
  }

  async createFolder(): Promise<Folder> {
    // フォルダ作成
    throw new Error('Not implemented');
  }

  async getNode(id: NodeId): Promise<Node | null> {
    // ノード取得
    throw new Error('Not implemented');
  }

  async getRoot(): Promise<Folder> {
    // ルートフォルダ取得
    throw new Error('Not implemented');
  }

  async dump(progress: (n: number) => void): Promise<void> {
    // NDJSON形式でダンプ
    throw new Error('Not implemented');
  }

  async undump(blob: Blob, progress: (n: number) => void): Promise<void> {
    // NDJSON形式でリストア
    throw new Error('Not implemented');
  }
}

// FSAFile, FSAFolder も同様にスケルトンを用意
export class FSAFile extends File {
  // private sqlite: any;
  // private blobStore: any;

  constructor(fileSystem: FileSystem, id: NodeId /*, sqlite, blobStore */) {
    super(fileSystem, id);
    // this.sqlite = sqlite;
    // this.blobStore = blobStore;
  }

  async read(): Promise<any> {
    throw new Error('Not implemented');
  }

  async write(data: any) {
    throw new Error('Not implemented');
  }

  async readMediaResource(): Promise<MediaResource> {
    throw new Error('Not implemented');
  }

  async writeMediaResource(mediaResource: MediaResource): Promise<void> {
    throw new Error('Not implemented');
  }

  async readBlob(): Promise<Blob> {
    throw new Error('Not implemented');
  }

  async writeBlob(blob: Blob): Promise<void> {
    throw new Error('Not implemented');
  }
}

export class FSAFolder extends Folder {
  // private sqlite: any;

  constructor(fileSystem: FileSystem, id: NodeId /*, sqlite */) {
    super(fileSystem, id);
    // this.sqlite = sqlite;
  }

  getType(): NodeType {
    return 'folder';
  }

  asFolder() {
    return this;
  }

  async setAttribute(key: string, value: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getAttribute(key: string): Promise<string | null> {
    throw new Error('Not implemented');
  }

  async list(): Promise<Entry[]> {
    throw new Error('Not implemented');
  }

  async link(name: string, nodeId: NodeId): Promise<BindId> {
    throw new Error('Not implemented');
  }

  async unlink(bindId: BindId): Promise<void> {
    throw new Error('Not implemented');
  }

  async unlinkv(bindIds: BindId[]): Promise<void> {
    throw new Error('Not implemented');
  }

  async rename(bindId: BindId, newname: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> {
    throw new Error('Not implemented');
  }

  async getEntry(bindId: BindId): Promise<Entry | null> {
    throw new Error('Not implemented');
  }

  async getEntryByName(name: string): Promise<Entry | null> {
    throw new Error('Not implemented');
  }

  async getEntriesByName(name: string): Promise<Entry[]> {
    throw new Error('Not implemented');
  }
}