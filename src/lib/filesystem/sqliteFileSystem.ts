import type { NodeId, NodeType, BindId, Entry, RemoteMediaReference, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { initSqlite } from './sqlite/initSqlite';
import { ulid } from 'ulid';
import { createCanvasFromImage } from '../layeredCanvas/tools/imageUtil';

// 型定義
type SqliteDB = any;
type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;
type FileSystemFileHandle = globalThis.FileSystemFileHandle;

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

  async dump(progress: (n: number) => void): Promise<void> {
    // ストリームで書き出し
    const nodes = this.sqlite.select("SELECT * FROM nodes");
    const children = this.sqlite.select("SELECT * FROM children");
    const files = this.sqlite.select("SELECT * FROM files");
    const total = nodes.length + children.length + files.length;
    let count = 0;
    const encoder = new TextEncoder();
    const blobStore = this.blobStore; // クロージャでキャプチャ

    const stream = new ReadableStream({
      async pull(controller) {
        // nodes
        for (const node of nodes) {
          controller.enqueue(encoder.encode(JSON.stringify({ ...node, _table: 'nodes' }) + "\n"));
          count++;
          progress(count / total * 0.8);
        }
        // children
        for (const child of children) {
          controller.enqueue(encoder.encode(JSON.stringify({ ...child, _table: 'children' }) + "\n"));
          count++;
          progress(count / total * 0.8);
        }
        // files
        for (const file of files) {
          let out = { ...file, _table: 'files' };
          if (file.blobPath) {
            try {
              const blob = await blobStore.read(file.id);
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject();
                reader.readAsDataURL(blob);
              });
              out.blob = dataUrl;
            } catch {}
          }
          controller.enqueue(encoder.encode(JSON.stringify(out) + "\n"));
          count++;
          progress(count / total * 0.8);
        }
        controller.close();
        progress(1);
      }
    });
    (window as any).lastFSADumpBlob = new Blob([await streamToArrayBuffer(stream)], { type: "application/x-ndjson" });
  }

  async undump(blob: Blob, progress: (n: number) => void): Promise<void> {
    // 1. 全テーブルtruncate
    await this.sqlite.transaction(async () => {
      this.sqlite.run("DELETE FROM nodes");
      this.sqlite.run("DELETE FROM children");
      this.sqlite.run("DELETE FROM files");
    });
    // 2. NDJSONストリームを読み込み
    const stream = blob.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let count = 0;
    let batch: any[] = [];
    const batchSize = 1000;

    const putBatch = async (batch: any[]) => {
      await this.sqlite.transaction(async () => {
        for (const obj of batch) {
          if (obj._table === 'nodes') {
            this.sqlite.run(
              "INSERT INTO nodes(id, type, attributes) VALUES (?, ?, ?)",
              [obj.id, obj.type, obj.attributes || '{}']
            );
          } else if (obj._table === 'children') {
            this.sqlite.run(
              "INSERT INTO children(parentId, bindId, name, childId, idx) VALUES (?, ?, ?, ?, ?)",
              [obj.parentId, obj.bindId, obj.name, obj.childId, obj.idx]
            );
          } else if (obj._table === 'files') {
            this.sqlite.run(
              "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, ?, ?, ?)",
              [obj.id, obj.inlineContent, obj.blobPath, obj.mediaType]
            );
            if (obj.blob) {
              const res = await fetch(obj.blob);
              const blobObj = await res.blob();
              await this.blobStore.write(obj.id, blobObj);
            }
          }
        }
      });
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) {
            const obj = JSON.parse(line);
            batch.push(obj);
            count++;
            if (batch.length >= batchSize) {
              await putBatch(batch);
              batch = [];
            }
            progress(0.1 + 0.8 * (count / (count + 1)));
          }
        }
      }
      if (batch.length > 0) {
        await putBatch(batch);
      }
    } finally {
      reader.releaseLock();
    }
    progress(1);
    await this.sqlite.persist();
  }
}

// ユーティリティ
async function streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
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
    if (file.inlineContent) return file.inlineContent;
    if (file.blobPath) {
      const blob = await this.blobStore.read(this.id);
      return await blob.text();
    }
    return null;
  }
  async write(data: any) {
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "UPDATE files SET inlineContent = ?, blobPath = NULL WHERE id = ?",
        [data, this.id]
      );
    });
    await this.sqlite.persist();
  }
  async readMediaResource(): Promise<MediaResource> {
    const file = this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (!file) throw new Error('File not found');
    if (file.mediaType === 'image' || file.mediaType === undefined) {
      if (file.blobPath) {
        const blob = await this.blobStore.read(this.id);
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        await image.decode();
        return createCanvasFromImage(image);
      } else if (file.inlineContent) {
        const image = new Image();
        image.src = file.inlineContent;
        await image.decode();
        return createCanvasFromImage(image);
      }
    }
    if (file.mediaType === 'video') {
      if (file.blobPath) {
        const blob = await this.blobStore.read(this.id);
        const video = document.createElement('video');
        video.src = URL.createObjectURL(blob);
        await new Promise((resolve) => {
          video.onloadeddata = resolve;
        });
        return video;
      }
    }
    throw new Error('Unknown media type');
  }
  async writeMediaResource(mediaResource: MediaResource): Promise<void> {
    if (mediaResource instanceof HTMLCanvasElement) {
      const blob = await new Promise<Blob>((resolve) => (mediaResource as HTMLCanvasElement).toBlob(resolve as any));
      await this.blobStore.write(this.id, blob!);
      await this.sqlite.transaction(async () => {
        this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = 'image' WHERE id = ?",
          [`blobs/${this.id}.bin`, this.id]
        );
      });
    } else if (mediaResource instanceof HTMLVideoElement) {
      const blob = await fetch(mediaResource.src).then(res => res.blob());
      await this.blobStore.write(this.id, blob);
      await this.sqlite.transaction(async () => {
        this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = 'video' WHERE id = ?",
          [`blobs/${this.id}.bin`, this.id]
        );
      });
    } else {
      await this.sqlite.transaction(async () => {
        this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = NULL, mediaType = NULL WHERE id = ?",
          [this.id]
        );
      });
    }
    await this.sqlite.persist();
  }
  async readBlob(): Promise<Blob> {
    return await this.blobStore.read(this.id);
  }
  async writeBlob(blob: Blob): Promise<void> {
    await this.blobStore.write(this.id, blob);
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = NULL WHERE id = ?",
        [`blobs/${this.id}.bin`, this.id]
      );
    });
    await this.sqlite.persist();
  }
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