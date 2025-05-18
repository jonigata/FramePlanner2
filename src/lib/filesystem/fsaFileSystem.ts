import type { NodeId, NodeType, BindId, Entry, MediaResource } from './fileSystem.js';
import { Node, File, Folder, FileSystem } from './fileSystem.js';
import { SqlJsAdapter } from './sqlite/SqlJsAdapter.js';
import { BlobStore, externalizeBlobsInObject, internalizeBlobsInObject } from './sqlite/BlobStore.js';
import { ulid } from 'ulid';

// 型定義
type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;


export class FSAFileSystem extends FileSystem {
  private sqlite: SqlJsAdapter;
  private blobStore: BlobStore;

  constructor() {
    super();
    this.sqlite = new SqlJsAdapter();
    this.blobStore = new BlobStore();
  }

  async open(dirHandle: FileSystemDirectoryHandle): Promise<void> {
    await this.sqlite.open(dirHandle);
    await this.blobStore.open(dirHandle);
    // ルートノードがなければ作成
    const root = await this.sqlite.selectOne("SELECT id FROM nodes WHERE id = '/'");
    if (!root) {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run("INSERT INTO nodes(id, type, attributes) VALUES (?, 'folder', ?)", ['/', '{}']);
    }
    await this.sqlite.persist();
  }

  async createFile(_type: string = 'text'): Promise<File> {
    const id = ulid() as NodeId;
    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "INSERT INTO nodes(id, type, attributes) VALUES (?, 'file', ?)",
        [id, '{}']
      );
      await this.sqlite.run(
        "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, '', NULL, NULL)",
        [id]
      );
    });
    await this.sqlite.persist();
    return new FSAFile(this, id, this.sqlite, this.blobStore);
  }

  async createFileWithId(id: NodeId, _type: string = 'text'): Promise<File> {
    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "INSERT INTO nodes(id, type, attributes) VALUES (?, 'file', ?)",
        [id, '{}']
      );
      await this.sqlite.run(
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
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "INSERT INTO nodes(id, type, attributes) VALUES (?, 'folder', ?)",
        [id, '{}']
      );
    });
    await this.sqlite.persist();
    return new FSAFolder(this, id, this.sqlite, this.blobStore);
  }

  async destroyNode(id: NodeId): Promise<void> {
    // 子孫も再帰削除
    const node = await this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [id]);
    if (!node) return;
    if (node.type === 'folder') {
      const children = await this.sqlite.select("SELECT childId FROM children WHERE parentId = ?", [id]);
      for (const c of children) {
        await this.destroyNode(c.childId);
      }
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run("DELETE FROM children WHERE parentId = ?", [id]);
    } else if (node.type === 'file') {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run("DELETE FROM files WHERE id = ?", [id]);
      await this.blobStore.delete(id);
    }
    if (!this.sqlite.run) throw new Error('DB not initialized');
    await this.sqlite.run("DELETE FROM nodes WHERE id = ?", [id]);
    await this.sqlite.persist();
  }

  async getNode(id: NodeId): Promise<Node | null> {
    const node = await this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [id]);
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
    const files = await this.sqlite.select("SELECT * FROM files");
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
  async dump(options?: { format?: "ndjson/v1"; onProgress?: (n: number) => void }): Promise<ReadableStream<Uint8Array>> {
    const onProgress = options?.onProgress ?? (() => {});
    onProgress(0);

    // 1. 全テーブル取得
    const nodes = await this.sqlite.select("SELECT * FROM nodes");
    const children = await this.sqlite.select("SELECT * FROM children");
    const files = await this.sqlite.select("SELECT * FROM files");
    onProgress(0.05);

    // 2. NDJSONストリーム生成
    const encoder = new TextEncoder();
    let count = 0;
    const total = nodes.length + children.length + files.length;

    // ReadableStreamで逐次出力
    const self = this;
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        // nodes
        for (const node of nodes) {
          controller.enqueue(encoder.encode(JSON.stringify({ table: "nodes", ...node }) + "\n"));
          count++;
          if (count % 100 === 0) await new Promise(r => setTimeout(r, 0));
          onProgress(0.05 + 0.3 * (count / total));
        }
        // children
        for (const child of children) {
          controller.enqueue(encoder.encode(JSON.stringify({ table: "children", ...child }) + "\n"));
          count++;
          if (count % 100 === 0) await new Promise(r => setTimeout(r, 0));
          onProgress(0.35 + 0.3 * (count / total));
        }
        // files + blobs
        for (const file of files) {
          let fileObj = { ...file, table: "files" };
          if (file.blobPath) {
            try {
              const blob = await self.blobStore.read(file.id);
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
          controller.enqueue(encoder.encode(JSON.stringify(fileObj) + "\n"));
          count++;
          if (count % 100 === 0) await new Promise(r => setTimeout(r, 0));
          onProgress(0.65 + 0.3 * (count / total));
        }
        onProgress(1);
        controller.close();
      }
    });
  }

  // --- NDJSONインポート: nodes, children, files, blobsをリストア ---
  async undump(
    stream: ReadableStream<Uint8Array>,
    options?: { format?: "ndjson/v1"; onProgress?: (n: number) => void }
  ): Promise<void> {
    const onProgress = options?.onProgress ?? (() => {});
    onProgress(0);
    // 1. 全テーブルクリア
    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run("DELETE FROM nodes");
      await this.sqlite.run("DELETE FROM children");
      await this.sqlite.run("DELETE FROM files");
    });
    await this.sqlite.persist();

    // 2. NDJSONストリームを二股に分けて
    //    片方で行数カウント → 進捗総量を取得
    //    もう片方で実データを処理
    const [counterStream, processStream] = stream.tee();
    const lineCount = await FSAFileSystem.countLines(counterStream);
    const reader = processStream.getReader();
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
            await this._undumpBatch(batch, onProgress, count, lineCount);
            batch = [];
          }
        }
      }
      buffer = buffer.slice(start);
    }
    if (batch.length > 0) {
      await this._undumpBatch(batch, onProgress, count, lineCount);
    }
    await this.sqlite.persist();
    onProgress(1);
  }

  private async _undumpBatch(lines: string[], progress: (n: number) => void, count: number, total: number) {
    await this.sqlite.transaction(async () => {
      for (const line of lines) {
        const obj = JSON.parse(line);
        if (obj.table === "nodes") {
          if (!this.sqlite.run) throw new Error('DB not initialized');
          await this.sqlite.run(
            "INSERT INTO nodes(id, type, attributes) VALUES (?, ?, ?)",
            [obj.id, obj.type, obj.attributes]
          );
        } else if (obj.table === "children") {
          if (!this.sqlite.run) throw new Error('DB not initialized');
          await this.sqlite.run(
            "INSERT INTO children(parentId, bindId, name, childId, idx) VALUES (?, ?, ?, ?, ?)",
            [obj.parentId, obj.bindId, obj.name, obj.childId, obj.idx]
          );
        } else if (obj.table === "files") {
          if (!this.sqlite.run) throw new Error('DB not initialized');
          await this.sqlite.run(
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
  // --- 指定ディレクトリにfilesystem.dbが存在するか判定 ---
  static async existsDatabase(dirHandle: FileSystemDirectoryHandle): Promise<boolean> {
    try {
      await dirHandle.getFileHandle('filesystem.db', { create: false });
      return true;
    } catch {
      return false;
    }
  }

  async withoutPersist(f: () => Promise<void>): Promise<void> {
    try {
      this.sqlite.persistentSuspended = true;
      return await f();
    } finally {
      this.sqlite.persistentSuspended = false;
      await this.sqlite.persist();
    }
  }
}

export class FSAFile extends File {
  sqlite: SqlJsAdapter;
  blobStore: BlobStore;
  constructor(fileSystem: FileSystem, id: NodeId, sqlite: SqlJsAdapter, blobStore: BlobStore) {
    super(fileSystem, id);
    this.sqlite = sqlite;
    this.blobStore = blobStore;
  }
  async read(): Promise<any> {
    const file = await this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
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
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "UPDATE files SET inlineContent = ?, blobPath = NULL WHERE id = ?",
        [toStore, this.id]
      );
    });
    await this.sqlite.persist();
  }
  // --- 画像・動画・Blobリソースの読み書き ---
  async readMediaResource(): Promise<MediaResource> {
    const file = await this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (!file) throw new Error('File not found');
    const { createCanvasFromBlob, createVideoFromBlob, createCanvasFromImage } = await import('../layeredCanvas/tools/imageUtil.js');
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
      const { canvasToBlob } = await import('../layeredCanvas/tools/imageUtil.js');
      const blob = await canvasToBlob(mediaResource);
      await this.sqlite.transaction(async () => {
        if (!this.sqlite.run) throw new Error('DB not initialized');
        await this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = ? WHERE id = ?",
          [`blobs/${this.id}.bin`, 'image', this.id]
        );
      });
      await this.blobStore.write(this.id, blob);
    } else if (mediaResource instanceof HTMLVideoElement) {
      const blob = await fetch(mediaResource.src).then(res => res.blob());
      await this.sqlite.transaction(async () => {
        if (!this.sqlite.run) throw new Error('DB not initialized');
        await this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = ? WHERE id = ?",
          [`blobs/${this.id}.bin`, 'video', this.id]
        );
      });
      await this.blobStore.write(this.id, blob);
    } else {
      // RemoteMediaReference等
      await this.sqlite.transaction(async () => {
        if (!this.sqlite.run) throw new Error('DB not initialized');
        await this.sqlite.run(
          "UPDATE files SET inlineContent = ?, blobPath = NULL, mediaType = NULL WHERE id = ?",
          [JSON.stringify(mediaResource), this.id]
        );
      });
    }
    await this.sqlite.persist();
  }

  async readBlob(): Promise<Blob> {
    const file = await this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (file && file.blobPath) {
      return await this.blobStore.read(this.id);
    }
    throw new Error('No blob');
  }

  async writeBlob(blob: Blob): Promise<void> {
    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = NULL WHERE id = ?",
        [`blobs/${this.id}.bin`, this.id]
      );
    });
    await this.blobStore.write(this.id, blob);
    await this.sqlite.persist();
  }
}

export class FSAFolder extends Folder {
  sqlite: SqlJsAdapter;
  blobStore: BlobStore;
  constructor(fileSystem: FileSystem, id: NodeId, sqlite: SqlJsAdapter, blobStore: BlobStore) {
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
    const node = await this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [this.id]);
    const attrs = node && node.attributes ? JSON.parse(node.attributes) : {};
    attrs[key] = value;
    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "UPDATE nodes SET attributes = ? WHERE id = ?",
        [JSON.stringify(attrs), this.id]
      );
    });
    await this.sqlite.persist();
  }
  async getAttribute(key: string): Promise<string | null> {
    const node = await this.sqlite.selectOne("SELECT * FROM nodes WHERE id = ?", [this.id]);
    const attrs = node && node.attributes ? JSON.parse(node.attributes) : {};
    return attrs[key] ?? null;
  }
  async list(): Promise<Entry[]> {
    const children = await this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [this.id]);
    return children.map((c: any) => [c.bindId, c.name, c.childId]);
  }
  async link(name: string, nodeId: NodeId): Promise<BindId> {
    return await this.insert(name, nodeId, -1);
  }
  async unlink(bindId: BindId): Promise<void> {
    await this.sqlite.transaction(async () => {
      // idx再計算
      const entry = await this.sqlite.selectOne(
        "SELECT * FROM children WHERE parentId = ? AND bindId = ?",
        [this.id, bindId]
      );
      if (!entry) return;
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "DELETE FROM children WHERE parentId = ? AND bindId = ?",
        [this.id, bindId]
      );
      // idx詰め直し
      const children = await this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [this.id]);
      for (let i = 0; i < children.length; i++) {
        await this.sqlite.run(
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
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
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
      const children = await this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [this.id]);
      let idx = index;
      if (idx < 0) idx = children.length;
      // idx繰り下げ
      if (!this.sqlite.run) throw new Error('DB not initialized');
      for (let i = children.length - 1; i >= idx; i--) {
        await this.sqlite.run(
          "UPDATE children SET idx = ? WHERE parentId = ? AND bindId = ?",
          [i + 1, this.id, children[i].bindId]
        );
      }
      await this.sqlite.run(
        "INSERT INTO children(parentId, bindId, name, childId, idx) VALUES (?, ?, ?, ?, ?)",
        [this.id, bindId, name, nodeId, idx]
      );
    });
    await this.sqlite.persist();
    super.notifyInsert(bindId, index, null);
    return bindId;
  }
  async getEntry(bindId: BindId): Promise<Entry | null> {
    const entry = await this.sqlite.selectOne(
      "SELECT * FROM children WHERE parentId = ? AND bindId = ?",
      [this.id, bindId]
    );
    return entry ? [entry.bindId, entry.name, entry.childId] : null;
  }
  async getEntryByName(name: string): Promise<Entry | null> {
    const entry = await this.sqlite.selectOne(
      "SELECT * FROM children WHERE parentId = ? AND name = ?",
      [this.id, name]
    );
    return entry ? [entry.bindId, entry.name, entry.childId] : null;
  }
  async getEntriesByName(name: string): Promise<Entry[]> {
    const entries = await this.sqlite.select(
      "SELECT * FROM children WHERE parentId = ? AND name = ?",
      [this.id, name]
    );
    return entries.map((e: any) => [e.bindId, e.name, e.childId]);
  }
}

// --- streamToArrayBuffer など他ユーティリティは前回実装のまま ---
