import type { NodeId, NodeType, BindId, Entry, MediaResource } from './fileSystem.js';
import { Node, File, Folder, FileSystem } from './fileSystem.js';
import { SqlJsAdapter, type FilePersistenceProvider } from './sqlite/SqlJsAdapter.js';
import { type BlobStore, FSABlobStore, externalizeBlobsInObject, internalizeBlobsInObject } from './sqlite/BlobStore.js';
import { ulid } from 'ulid';

// 型定義
type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;

export class FSAFilePersistenceProvider implements FilePersistenceProvider {
  private dirHandle: FileSystemDirectoryHandle;

  constructor(dirHandle: FileSystemDirectoryHandle) {
    this.dirHandle = dirHandle;
  }

  async readFile(name: string): Promise<Uint8Array | null> {
    try {
      const fileHandle = await this.dirHandle.getFileHandle(name, { create: false });
      const file = await fileHandle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (!this.dirHandle) throw new Error('No dirHandle');
    const fileHandle = await this.dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(data);
    await writable.close();
  }

  async removeFile(name: string): Promise<void> {
    if (!this.dirHandle) throw new Error('No dirHandle');
    await this.dirHandle.removeEntry(name, { recursive: false });
  }

  async readText(name: string): Promise<string | null> {
    if (!this.dirHandle) throw new Error('No dirHandle');
    try {
      const fileHandle = await this.dirHandle.getFileHandle(name, { create: false });
      const file = await fileHandle.getFile();
      return await file.text();
    } catch {
      return null;
    }
  }

  async writeText(name: string, text: string): Promise<void> {
    if (!this.dirHandle) throw new Error('No dirHandle');
    const fileHandle = await this.dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(text);
    await writable.close();
  }

}

export class FSAFileSystem extends FileSystem {
  private sqlite: SqlJsAdapter;
  private blobStore: BlobStore;

  constructor(
    sqlite: SqlJsAdapter,
    blobStore?: BlobStore
  ) {
    super();
    this.sqlite = sqlite;
    this.blobStore = blobStore ?? new FSABlobStore();
  }

  async open(): Promise<void> {
    await this.sqlite.open();
    // BlobStoreのopenが必要な場合は、外部でセット済みのものを使う前提
    // await this.blobStore.open(...) は呼び出し側で必要に応じて行う
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

  // NDJSONストリームの各行を逐次パースするジェネレータ
  async *readNDJSONStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<any, void, unknown> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            yield JSON.parse(buffer);
          }
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        let start = 0;
        let newlineIndex: number;
        while ((newlineIndex = chunk.indexOf('\n', start)) !== -1) {
          const line = buffer + chunk.slice(start, newlineIndex).trim();
          if (line.length > 0) yield JSON.parse(line);
          start = newlineIndex + 1;
          buffer = '';
        }
        buffer += chunk.slice(start);
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ストリームの行数をカウント
  async countLines(stream: ReadableStream<Uint8Array>): Promise<number> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let lineCount = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        lineCount += chunk.split('\n').length - 1;
      }
    } finally {
      reader.releaseLock();
    }
    return lineCount;
  }

  async dump(options?: { format?: "ndjson/v1"; onProgress?: (n: number) => void }): Promise<ReadableStream<Uint8Array>> {
    const onProgress = options?.onProgress ?? (() => {});
    // 1. 全ノード取得
    const nodes = await this.sqlite.select("SELECT * FROM nodes");
    // 2. ファイル情報取得
    const files = await this.sqlite.select("SELECT * FROM files");
    const fileMap = new Map<string, any>();
    for (const file of files) {
      fileMap.set(file.id, file);
    }
    // 3. ノードごとにマージ
    const items: any[] = [];
    for (const node of nodes) {
      const item: any = { ...node };
      if (node.type === 'file') {
        const file = fileMap.get(node.id);
        if (file) {
          // content or blob
          if (file.inlineContent) {
            // 文字列ならそのまま、object なら blob 分離してシリアライズ
            let contentToDump: any = file.inlineContent;
            if (typeof file.inlineContent === 'object' && file.inlineContent !== null) {
              contentToDump = JSON.stringify(await externalizeBlobsInObject(file.inlineContent, this.blobStore, node.id));
            }
            item.content = contentToDump;
          } else if (file.blobPath) {
            try {
              const blob = await this.blobStore.read(node.id);
              // Blob→dataURL
              item.blob = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject();
                reader.readAsDataURL(blob);
              });
              item.mediaType = file.mediaType;
            } catch {
              // Blobが読めない場合は無視
            }
          }
        }
      } else if (node.type === 'folder') {
        // children
        const children = await this.sqlite.select("SELECT * FROM children WHERE parentId = ? ORDER BY idx", [node.id]);
        item.children = children.map((c: any) => [c.bindId, c.name, c.childId]);
        item.attributes = node.attributes ? JSON.parse(node.attributes) : {};
      }
      items.push(item);
    }

    // 4. NDJSONストリームで出力
    const encoder = new TextEncoder();
    let count = 0;
    const total = items.length;

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (count >= total) {
          onProgress(1);
          controller.close();
          return;
        }
        const value = items[count];
        const jsonString = JSON.stringify(value) + "\n";
        controller.enqueue(encoder.encode(jsonString));
        count++;
        onProgress(0.1 + 0.8 * (count / total));
        if (count % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    });

    return stream;
  }

  async undump(
    stream: ReadableStream<Uint8Array>,
    options?: { format?: "ndjson/v1"; onProgress?: (n: number) => void }
  ): Promise<void> {
    const onProgress = options?.onProgress ?? (() => {});
    onProgress(0);

    // 1. 既存データ削除
    await this.withoutPersist(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run("DELETE FROM children");
      await this.sqlite.run("DELETE FROM files");
      await this.sqlite.run("DELETE FROM nodes");
      // BlobStore全削除
      const fileIds = await this.sqlite.select("SELECT id FROM files");
      for (const f of fileIds) {
        await this.blobStore.delete(f.id);
      }
    });

    // 2. ストリームをteeして片方で行数カウント
    const [counterStream, dataStream] = stream.tee();
    const lineCount = await this.countLines(counterStream);

    // 3. 逐次パースしながらDBへ書き込み
    const batchSize = 1000;
    let batch: any[] = [];
    let count = 0;
    let writtenCount = 0;

    const saveBatch = async (itemsBatch: any[]) => {
      // 1. 先に Blob を全て書き込む（トランザクション外）
      for (const item of itemsBatch) {
        if (item.type === 'file' && item.blob) {
          await this.blobStore.write(item.id, item.blob);
        }
      }

      // 2. DB へのノード・ファイル・children の INSERT をトランザクションでまとめて行う
      await this.sqlite.transaction(async () => {
        for (const item of itemsBatch) {
          if (!this.sqlite.run) throw new Error('DB not initialized');
          // nodes
          const { id, type, attributes, ...rest } = item;
          await this.sqlite.run(
            "INSERT INTO nodes(id, type, attributes) VALUES (?, ?, ?)",
            [id, type, JSON.stringify(attributes ?? {})]
          );
          if (type === 'file') {
            // files
            if (item.blob) {
              await this.sqlite.run(
                "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, NULL, ?, ?)",
                [id, `blobs/${id}.bin`, item.mediaType ?? null]
              );
            } else {
              // contentがobjectならblobを分離してシリアライズ
              let contentToStore: string;
              if (typeof item.content === 'object' && item.content !== null) {
                // Blob分離
                contentToStore = JSON.stringify(await externalizeBlobsInObject(item.content, this.blobStore, id));
              } else {
                contentToStore = item.content ?? '';
              }
              await this.sqlite.run(
                "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, ?, NULL, ?)",
                [id, contentToStore, item.mediaType ?? null]
              );
            }
          } else if (type === 'folder') {
            // children
            if (item.children && Array.isArray(item.children)) {
              for (let idx = 0; idx < item.children.length; idx++) {
                const [bindId, name, childId] = item.children[idx];
                await this.sqlite.run(
                  "INSERT INTO children(parentId, bindId, name, childId, idx) VALUES (?, ?, ?, ?, ?)",
                  [id, bindId, name, childId, idx]
                );
              }
            }
          }
        }
      });
    };

    for await (const node of this.readNDJSONStream(dataStream)) {
      // blobがdataURLならBlobに戻す
      console.log(node);
      if (node.blob) {
        const res = await fetch(node.blob);
        node.blob = await res.blob();
      }
      batch.push(node);
      count++;
      onProgress(0.1 + 0.8 * (count / lineCount));
      console.log("A");
      if (batch.length >= batchSize) {
        console.log("B");
        await saveBatch(batch);
        console.log("C");
        writtenCount += batch.length;
        batch = [];
        await this.sqlite.persist();
        console.log("D");
      }
      console.log("E");
    }
    console.log("F");
    if (batch.length > 0) {
      console.log("G");
      await saveBatch(batch);
      console.log("H");
      await this.sqlite.persist();
      console.log("I");
      writtenCount += batch.length;
    }
    console.log("J");

    onProgress(1);
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
