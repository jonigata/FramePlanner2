import type { NodeId, NodeType, BindId, Entry, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { SQLiteAdapter } from './sqlite/SQLiteAdapter';
import { BlobStore, externalizeBlobsInObject, internalizeBlobsInObject } from './sqlite/BlobStore';
import { ulid } from 'ulid';

// 型定義
type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;


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
        } catch { }
      }
    }
    return total;
  }

  // --- NDJSONダンプ: nodes, children, files, blobsをエクスポート ---
  async dump(progress: (n: number) => void): Promise<Blob> {
    progress(0);
    // 1. 全テーブル取得
    const nodes = this.sqlite.select("SELECT * FROM nodes");
    const children = this.sqlite.select("SELECT * FROM children");
    const files = this.sqlite.select("SELECT * FROM files");
    progress(0.05);

    // 2. NDJSONエンコード
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    let count = 0;
    const total = nodes.length + children.length + files.length;
    // nodes
    for (const node of nodes) {
      chunks.push(encoder.encode(JSON.stringify({ table: "nodes", ...node }) + "\n"));
      count++;
      if (count % 100 === 0) await new Promise(r => setTimeout(r, 0));
      progress(0.05 + 0.3 * (count / total));
    }
    // children
    for (const child of children) {
      chunks.push(encoder.encode(JSON.stringify({ table: "children", ...child }) + "\n"));
      count++;
      if (count % 100 === 0) await new Promise(r => setTimeout(r, 0));
      progress(0.35 + 0.3 * (count / total));
    }
    // files + blobs
    for (const file of files) {
      let fileObj = { ...file, table: "files" };
      if (file.blobPath) {
        try {
          const blob = await this.blobStore.read(file.id);
          // BlobをDataURL化
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject();
            reader.readAsDataURL(blob);
          });
          fileObj = { ...fileObj, blob: dataUrl };
        } catch { }
      }
      chunks.push(encoder.encode(JSON.stringify(fileObj) + "\n"));
      count++;
      if (count % 100 === 0) await new Promise(r => setTimeout(r, 0));
      progress(0.65 + 0.3 * (count / total));
    }
    // 3. Blob化して保存
    const outBlob = new Blob(chunks, { type: "application/x-ndjson" });
    progress(1);
    return outBlob;
  }

  // --- NDJSONインポート: nodes, children, files, blobsをリストア ---
  async undump(blob: Blob, progress: (n: number) => void): Promise<void> {
    progress(0);
    // 1. 全テーブルクリア
    await this.sqlite.transaction(async () => {
      this.sqlite.run("DELETE FROM nodes");
      this.sqlite.run("DELETE FROM children");
      this.sqlite.run("DELETE FROM files");
    });
    await this.sqlite.persist();

    // 2. NDJSONストリームを1行ずつ読む
    const lineCount = await FSAFileSystem.countLines(blob.stream());
    const stream = blob.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let count = 0;
    let batch: any[] = [];
    const batchSize = 1000;

    // 3. バッチで挿入
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let start = 0, idx;
      while ((idx = buffer.indexOf('\n', start)) !== -1) {
        const line = buffer.slice(start, idx).trim();
        start = idx + 1;
        if (line) {
          batch.push(line);
          count++;
          if (batch.length >= batchSize) {
            await this._undumpBatch(batch, progress, count, lineCount);
            batch = [];
          }
        }
      }
      buffer = buffer.slice(start);
    }
    if (batch.length > 0) {
      await this._undumpBatch(batch, progress, count, lineCount);
    }
    await this.sqlite.persist();
    progress(1);
  }

  private async _undumpBatch(lines: string[], progress: (n: number) => void, count: number, total: number) {
    await this.sqlite.transaction(async () => {
      for (const line of lines) {
        const obj = JSON.parse(line);
        if (obj.table === "nodes") {
          this.sqlite.run(
            "INSERT INTO nodes(id, type, attributes) VALUES (?, ?, ?)",
            [obj.id, obj.type, obj.attributes]
          );
        } else if (obj.table === "children") {
          this.sqlite.run(
            "INSERT INTO children(parentId, bindId, name, childId, idx) VALUES (?, ?, ?, ?, ?)",
            [obj.parentId, obj.bindId, obj.name, obj.childId, obj.idx]
          );
        } else if (obj.table === "files") {
          this.sqlite.run(
            "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, ?, ?, ?)",
            [obj.id, obj.inlineContent, obj.blobPath, obj.mediaType]
          );
          // blobがDataURLならBlobStoreへ
          if (obj.blob) {
            const blob = await fetch(obj.blob).then(res => res.blob());
            await this.blobStore.write(obj.id, blob);
          }
        }
      }
    });
    progress(0.1 + 0.8 * (count / total));
  }

  // --- streamToArrayBufferユーティリティ ---
  static async streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
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

  // --- NDJSON行数カウント ---
  static async countLines(stream: ReadableStream<Uint8Array>): Promise<number> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let lineCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      lineCount += chunk.split('\n').length - 1;
    }
    return lineCount;
  }
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
  // --- 画像・動画・Blobリソースの読み書き ---
  async readMediaResource(): Promise<MediaResource> {
    const file = this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (!file) throw new Error('File not found');
    const { createCanvasFromBlob, createVideoFromBlob, createCanvasFromImage } = await import('../layeredCanvas/tools/imageUtil');
    if (file.inlineContent) {
      // DataURL or JSON
      try {
        const json = JSON.parse(file.inlineContent);
        if (json && json.__blobPath) {
          const blob = await this.blobStore.read(this.id);
          if (file.mediaType === 'image' || file.mediaType === undefined) {
            return await createCanvasFromBlob(blob);
          }
          if (file.mediaType === 'video') {
            return await createVideoFromBlob(blob);
          }
        }
      } catch { }
      // 画像DataURL
      if (file.mediaType === 'image' || file.mediaType === undefined) {
        const img = new Image();
        img.src = file.inlineContent;
        await img.decode();
        return await createCanvasFromImage(img);
      }
      if (file.mediaType === 'video') {
        const video = document.createElement('video');
        video.src = file.inlineContent;
        await new Promise((resolve) => { video.onloadeddata = resolve; });
        return video;
      }
    }
    if (file.blobPath) {
      const blob = await this.blobStore.read(this.id);
      if (file.mediaType === 'image' || file.mediaType === undefined) {
        return await createCanvasFromBlob(blob);
      }
      if (file.mediaType === 'video') {
        return await createVideoFromBlob(blob);
      }
    }
    throw new Error('Broken media data');
  }

  async writeMediaResource(mediaResource: MediaResource): Promise<void> {
    if (mediaResource instanceof HTMLCanvasElement) {
      const { canvasToBlob } = await import('../layeredCanvas/tools/imageUtil');
      const blob = await canvasToBlob(mediaResource);
      await this.sqlite.transaction(async () => {
        this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = ? WHERE id = ?",
          [`blobs/${this.id}.bin`, 'image', this.id]
        );
      });
      await this.blobStore.write(this.id, blob);
    } else if (mediaResource instanceof HTMLVideoElement) {
      const blob = await fetch(mediaResource.src).then(res => res.blob());
      await this.sqlite.transaction(async () => {
        this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = ? WHERE id = ?",
          [`blobs/${this.id}.bin`, 'video', this.id]
        );
      });
      await this.blobStore.write(this.id, blob);
    } else {
      // RemoteMediaReference等
      await this.sqlite.transaction(async () => {
        this.sqlite.run(
          "UPDATE files SET inlineContent = ?, blobPath = NULL, mediaType = NULL WHERE id = ?",
          [JSON.stringify(mediaResource), this.id]
        );
      });
    }
    await this.sqlite.persist();
  }

  async readBlob(): Promise<Blob> {
    const file = this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (file && file.blobPath) {
      return await this.blobStore.read(this.id);
    }
    throw new Error('No blob');
  }

  async writeBlob(blob: Blob): Promise<void> {
    await this.sqlite.transaction(async () => {
      this.sqlite.run(
        "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = NULL WHERE id = ?",
        [`blobs/${this.id}.bin`, this.id]
      );
    });
    await this.blobStore.write(this.id, blob);
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

// --- streamToArrayBuffer など他ユーティリティは前回実装のまま ---