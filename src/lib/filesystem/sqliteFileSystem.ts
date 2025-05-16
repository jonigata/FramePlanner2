import type { NodeId, NodeType, BindId, Entry, RemoteMediaReference, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { initSqlite } from './sqlite/initSqlite';
import { ulid } from 'ulid';
import { createCanvasFromImage } from '../layeredCanvas/tools/imageUtil';

// 型定義
type SqliteDB = any;
type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;
type FileSystemFileHandle = globalThis.FileSystemFileHandle;

// --- ユーティリティ: オブジェクト内のBlobを外部ファイル化し、blobPath参照に置換 ---
async function externalizeBlobsInObject(
  obj: any,
  blobStore: BlobStore,
  baseId: string,
  path: string[] = []
): Promise<any> {
  if (obj instanceof Blob) {
    const blobId = `${baseId}_${path.join('_')}`;
    await blobStore.write(blobId, obj);
    return { __blobPath: `blobs/${blobId}.bin` };
  } else if (Array.isArray(obj)) {
    return Promise.all(obj.map((v, i) => externalizeBlobsInObject(v, blobStore, baseId, [...path, String(i)])));
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = await externalizeBlobsInObject(v, blobStore, baseId, [...path, k]);
    }
    return result;
  } else {
    return obj;
  }
}

// --- ユーティリティ: blobPath参照をBlobに戻す ---
async function internalizeBlobsInObject(
  obj: any,
  blobStore: BlobStore
): Promise<any> {
  if (obj && typeof obj === 'object') {
    if (obj.__blobPath && typeof obj.__blobPath === 'string') {
      const m = obj.__blobPath.match(/^blobs\/(.+)\.bin$/);
      if (m) {
        return await blobStore.read(m[1]);
      }
    }
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((v) => internalizeBlobsInObject(v, blobStore)));
    } else {
      const result: any = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = await internalizeBlobsInObject(v, blobStore);
      }
      return result;
    }
  } else {
    return obj;
  }
}

class SQLiteAdapter {
  db: SqliteDB | null = null;
  dbFileHandle: FileSystemFileHandle | null = null;

  async open(dbFileHandle: FileSystemFileHandle) {
    this.dbFileHandle = dbFileHandle;
    const sqlite3 = await initSqlite();

    let dbBuffer: Uint8Array | null = null;
    try {
      const file = await dbFileHandle.getFile();
      dbBuffer = new Uint8Array(await file.arrayBuffer());
    } catch (e) {
      dbBuffer = null;
    }
    this.db = dbBuffer ? new sqlite3.oo1.DB(dbBuffer) : new sqlite3.oo1.DB();
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes(
        id TEXT PRIMARY KEY,
        type TEXT CHECK(type IN ('file','folder')),
        attributes JSON DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS children(
        parentId TEXT,
        bindId TEXT,
        name TEXT,
        childId TEXT,
        idx INTEGER,
        PRIMARY KEY(parentId, bindId)
      );
      CREATE TABLE IF NOT EXISTS files(
        id TEXT PRIMARY KEY,
        inlineContent TEXT,
        blobPath TEXT,
        mediaType TEXT
      );
      CREATE INDEX IF NOT EXISTS children_parent_idx ON children(parentId, idx);
    `);
  }

  async persist() {
    if (!this.db || !this.dbFileHandle) return;
    const buffer = this.db.export();
    const writable = await this.dbFileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();
  }

  run(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  }

  select(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const result: any[] = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  selectOne(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  async transaction(fn: () => Promise<void>) {
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

class BlobStore {
  dirHandle: FileSystemDirectoryHandle | null = null;
  async open(dirHandle: FileSystemDirectoryHandle) {
    this.dirHandle = await dirHandle.getDirectoryHandle('blobs', { create: true });
  }
  async write(id: string, blob: Blob) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    const fileHandle = await this.dirHandle.getFileHandle(`${id}.bin`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
  async read(id: string): Promise<Blob> {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    const fileHandle = await this.dirHandle.getFileHandle(`${id}.bin`);
    const file = await fileHandle.getFile();
    return file;
  }
  async delete(id: string) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    await this.dirHandle.removeEntry(`${id}.bin`);
  }
  async gc(validIds: Set<string>) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    for await (const entry of this.dirHandle.values()) {
      if (entry.kind === 'file') {
        const id = entry.name.replace(/\.bin$/, '');
        if (!validIds.has(id)) {
          await this.dirHandle.removeEntry(entry.name);
        }
      }
    }
  }
}

export class FSAFileSystem extends FileSystem {
  private sqlite: SQLiteAdapter;
  private blobStore: BlobStore;

  constructor() {
    super();
    this.sqlite = new SQLiteAdapter();
    this.blobStore = new BlobStore();
  }

  async open(dirHandle: FileSystemDirectoryHandle): Promise<void> {
    const dbFileHandle = await dirHandle.getFileHandle('filesystem.db', { create: true });
    await this.sqlite.open(dbFileHandle);
    await this.blobStore.open(dirHandle);
    // ルートノードがなければ作成
    const root = this.sqlite.selectOne("SELECT id FROM nodes WHERE id = '/'");
    if (!root) {
      this.sqlite.run("INSERT INTO nodes(id, type, attributes) VALUES (?, 'folder', ?)", ['/', '{}']);
    }
    await this.sqlite.persist();
  }

  async createFile(_type: string = 'text'): Promise<File> {
    const id = ulid() as NodeId;
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "INSERT INTO nodes(id, type, attributes) VALUES (?, 'file', ?)",
        [id, '{}']
      );
      this.sqlite.run(
        "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, '', NULL, NULL)",
        [id]
      );
    });
    await this.sqlite.persist();
    return new FSAFile(this, id, this.sqlite, this.blobStore);
  }

  async createFolder(): Promise<Folder> {
    const id = ulid() as NodeId;
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "INSERT INTO nodes(id, type, attributes) VALUES (?, 'folder', ?)",
        [id, '{}']
      );
    });
    await this.sqlite.persist();
    return new FSAFolder(this, id, this.sqlite, this.blobStore);
  }

  async destroyNode(id: NodeId): Promise<void> {
    // 子孫も再帰削除
    const node = this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [id]);
    if (!node) return;
    if (node.type === 'folder') {
      const children = this.sqlite.select("SELECT childId FROM children WHERE parentId = ?", [id]);
      for (const c of children) {
        await this.destroyNode(c.childId);
      }
      this.sqlite.run("DELETE FROM children WHERE parentId = ?", [id]);
    } else if (node.type === 'file') {
      this.sqlite.run("DELETE FROM files WHERE id = ?", [id]);
      await this.blobStore.delete(id);
    }
    this.sqlite.run("DELETE FROM nodes WHERE id = ?", [id]);
    await this.sqlite.persist();
  }

  async getNode(id: NodeId): Promise<Node | null> {
    const node = this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [id]);
    if (!node) return null;
    if (node.type === 'file') {
      return new FSAFile(this, id, this.sqlite, this.blobStore);
    } else if (node.type === 'folder') {
      return new FSAFolder(this, id, this.sqlite, this.blobStore);
    }
    return null;
  }

  async getRoot(): Promise<Folder> {
    return new FSAFolder(this, '/' as NodeId, this.sqlite, this.blobStore);
  }

  async collectTotalSize(): Promise<number> {
    const files = this.sqlite.select("SELECT * FROM files");
    let total = 0;
    for (const file of files) {
      if (file.inlineContent) {
        total += file.inlineContent.length;
      } else if (file.blobPath) {
        try {
          const blob = await this.blobStore.read(file.id);
          total += blob.size;
        } catch {}
      }
    }
    return total;
  }

  // ... dump, undump, streamToArrayBuffer, FSAFile, FSAFolder などは前回実装のまま ...
}

export class FSAFile extends File {
  sqlite: SQLiteAdapter;
  blobStore: BlobStore;
  constructor(fileSystem: FileSystem, id: NodeId, sqlite: SQLiteAdapter, blobStore: BlobStore) {
    super(fileSystem, id);
    this.sqlite = sqlite;
    this.blobStore = blobStore;
  }
  async read(): Promise<any> {
    const file = this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (!file) return null;
    if (file.inlineContent) {
      try {
        const json = JSON.parse(file.inlineContent);
        return await internalizeBlobsInObject(json, this.blobStore);
      } catch {
        return file.inlineContent;
      }
    }
    if (file.blobPath) {
      const blob = await this.blobStore.read(this.id);
      return await blob.text();
    }
    return null;
  }
  async write(data: any) {
    // オブジェクト内のBlobを外部ファイル化し、JSONにblobPathを埋め込む
    let toStore: string;
    if (typeof data === 'object' && data !== null) {
      const ext = await externalizeBlobsInObject(data, this.blobStore, this.id);
      toStore = JSON.stringify(ext);
    } else {
      toStore = String(data);
    }
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "UPDATE files SET inlineContent = ?, blobPath = NULL WHERE id = ?",
        [toStore, this.id]
      );
    });
    await this.sqlite.persist();
  }
  // ...（readMediaResource, writeMediaResource, readBlob, writeBlobは前回実装のまま）...
}

export class FSAFolder extends Folder {
  sqlite: SQLiteAdapter;
  blobStore: BlobStore;
  constructor(fileSystem: FileSystem, id: NodeId, sqlite: SQLiteAdapter, blobStore: BlobStore) {
    super(fileSystem, id);
    this.sqlite = sqlite;
    this.blobStore = blobStore;
  }
  getType(): NodeType {
    return 'folder';
  }
  asFolder() {
    return this;
  }
  async setAttribute(key: string, value: string): Promise<void> {
    const node = this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [this.id]);
    const attrs = node && node.attributes ? JSON.parse(node.attributes) : {};
    attrs[key] = value;
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "UPDATE nodes SET attributes = ? WHERE id = ?",
        [JSON.stringify(attrs), this.id]
      );
    });
    await this.sqlite.persist();
  }
  async getAttribute(key: string): Promise<string | null> {
    const node = this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [this.id]);
    const attrs = node && node.attributes ? JSON.parse(node.attributes) : {};
    return attrs[key] ?? null;
  }
  async list(): Promise<Entry[]> {
    const children = this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [this.id]);
    return children.map((c: any) => [c.bindId, c.name, c.childId]);
  }
  async link(name: string, nodeId: NodeId): Promise<BindId> {
    return await this.insert(name, nodeId, -1);
  }
  async unlink(bindId: BindId): Promise<void> {
    await this.sqlite.transaction(async () => {
      // idx再計算
      const entry = this.sqlite.selectOne(
        "SELECT * FROM children WHERE parentId = ? AND bindId = ?",
        [this.id, bindId]
      );
      if (!entry) return;
      this.sqlite.run(
        "DELETE FROM children WHERE parentId = ? AND bindId = ?",
        [this.id, bindId]
      );
      // idx詰め直し
      const children = this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [this.id]);
      for (let i = 0; i < children.length; i++) {
        this.sqlite.run(
          "UPDATE children SET idx = ? WHERE parentId = ? AND bindId = ?",
          [i, this.id, children[i].bindId]
        );
      }
    });
    await this.sqlite.persist();
    super.notifyDelete(bindId);
  }
  async unlinkv(bindIds: BindId[]): Promise<void> {
    for (const bindId of bindIds) {
      await this.unlink(bindId);
    }
  }
  async rename(bindId: BindId, newname: string): Promise<void> {
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "UPDATE children SET name = ? WHERE parentId = ? AND bindId = ?",
        [newname, this.id, bindId]
      );
    });
    await this.sqlite.persist();
    super.notifyRename(bindId, newname);
  }
  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> {
    const bindId = ulid() as BindId;
    await this.sqlite.transaction(async () => {
      const children = this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [this.id]);
      let idx = index;
      if (idx < 0) idx = children.length;
      // idx繰り下げ
      for (let i = children.length - 1; i >= idx; i--) {
        this.sqlite.run(
          "UPDATE children SET idx = ? WHERE parentId = ? AND bindId = ?",
          [i + 1, this.id, children[i].bindId]
        );
      }
      this.sqlite.run(
        "INSERT INTO children(parentId, bindId, name, childId, idx) VALUES (?, ?, ?, ?, ?)",
        [this.id, bindId, name, nodeId, idx]
      );
    });
    await this.sqlite.persist();
    super.notifyInsert(bindId, index, null);
    return bindId;
  }
  async getEntry(bindId: BindId): Promise<Entry | null> {
    const entry = this.sqlite.selectOne(
      "SELECT * FROM children WHERE parentId = ? AND bindId = ?",
      [this.id, bindId]
    );
    return entry ? [entry.bindId, entry.name, entry.childId] : null;
  }
  async getEntryByName(name: string): Promise<Entry | null> {
    const entry = this.sqlite.selectOne(
      "SELECT * FROM children WHERE parentId = ? AND name = ?",
      [this.id, name]
    );
    return entry ? [entry.bindId, entry.name, entry.childId] : null;
  }
  async getEntriesByName(name: string): Promise<Entry[]> {
    const entries = this.sqlite.select(
      "SELECT * FROM children WHERE parentId = ? AND name = ?",
      [this.id, name]
    );
    return entries.map((e: any) => [e.bindId, e.name, e.childId]);
  }
}

// --- streamToArrayBuffer など他ユーティリティは前回実装のまま ---