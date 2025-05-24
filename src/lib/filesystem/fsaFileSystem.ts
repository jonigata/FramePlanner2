import type { NodeId, NodeType, BindId, Entry, MediaResource } from './fileSystem.js';
import { Node, File, Folder, FileSystem } from './fileSystem.js';
import { SqlJsAdapter, type FilePersistenceProvider } from './sqlite/SqlJsAdapter.js';
import { type BlobStore, FSABlobStore, externalizeBlobsInObject, internalizeBlobsInObject } from './sqlite/BlobStore.js';
import { ulid } from 'ulid';
import type { MediaConverter } from './mediaConverter.js';

// 型定義
type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;

// {__blob__: true, data, type} を再帰的に Blob に戻す
async function deserializeBlobs(obj: any, mediaConverter: MediaConverter): Promise<any> {
  if (obj && typeof obj === "object") {
    if (obj.__blob__ && obj.data) {
      const blob = await mediaConverter.dataURLtoBlob(obj.data);
      if (obj.type && blob.type !== obj.type) {
        return new Blob([blob], { type: obj.type });
      }
      return blob;
    }
    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => deserializeBlobs(item, mediaConverter)));
    }
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = await deserializeBlobs(obj[key], mediaConverter);
    }
    return result;
  }
  return obj;
}

// オブジェクト内のすべてのBlobをdataURLラッパー({__blob__:true,data:...})に再帰的に変換
async function serializeBlobs(obj: any, mediaConverter: MediaConverter): Promise<any> {
  if (obj instanceof Blob) {
    return { __blob__: true, data: await mediaConverter.blobToDataURL(obj), type: obj.type };
  }
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => serializeBlobs(item, mediaConverter)));
  }
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = await serializeBlobs(obj[key], mediaConverter);
    }
    return result;
  }
  return obj;
}

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
  private mediaConverter: MediaConverter;

  constructor(
    sqlite: SqlJsAdapter,
    blobStore: BlobStore,
    mediaConverter: MediaConverter
  ) {
    super();
    this.sqlite = sqlite;
    this.blobStore = blobStore;
    this.mediaConverter = mediaConverter;
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
    return new FSAFile(this, id, this.sqlite, this.blobStore, this.mediaConverter);
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
    return new FSAFile(this, id, this.sqlite, this.blobStore, this.mediaConverter);
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
      return new FSAFile(this, id, this.sqlite, this.blobStore, this.mediaConverter);
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
    } catch (error) {
      throw error;
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
            const json = JSON.parse(file.inlineContent);
            item.content = (await internalizeBlobsInObject(json, this.blobStore)).data;
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
              item.mediaType = file.mediaType ?? null;
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

    const mediaConverter = this.mediaConverter; // クロージャのためにmediaConverterをキャプチャ

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (count >= total) {
          onProgress(1);
          controller.close();
          return;
        }
        let value = items[count];
        // 再帰的にBlobをdataURLラッパーに変換
        value = await serializeBlobs(value, mediaConverter);
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

    // dataURLToBlob は mediaConverter を使用するように変更
    const saveBatch = async (itemsBatch: any[]) => {
      // 1. 先に Blob を全て書き込む（トランザクション外）
      for (const item of itemsBatch) {
        if (item.type === 'file' && item.blob) {
          if (typeof item.blob === 'string' && item.blob.startsWith('data:')) {
            const actualBlob = await this.mediaConverter.dataURLtoBlob(item.blob);
            await this.blobStore.write(item.id, actualBlob);
          } else if (item.blob instanceof Blob) {
            await this.blobStore.write(item.id, item.blob);
          }
        }
      }

      // 2. DB へのノード・ファイル・children の INSERT をトランザクションでまとめて行う
      await this.sqlite.transaction(async () => {
        for (const item of itemsBatch) {
          if (!this.sqlite.run) throw new Error('DB not initialized');
          // nodes
          const { id, type, attributes, content, blob, mediaType, children, ...rest } = item;
          await this.sqlite.run(
            "INSERT INTO nodes(id, type, attributes) VALUES (?, ?, ?)",
            [id, type, JSON.stringify(attributes ?? {})]
          );
          if (type === 'file') {
            // files
            if (blob) {
              await this.sqlite.run(
                "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, NULL, ?, ?)",
                [id, `blobs/${id}.bin`, mediaType ?? null]
              );
            } else if (content !== undefined) {
              // contentの種類に応じて処理
              if (typeof content === 'string' && content.startsWith('data:')) {
                // dataURL形式の画像データ → Blobとして保存
                const actualBlob = await this.mediaConverter.dataURLtoBlob(content);
                await this.blobStore.write(id, actualBlob);
                await this.sqlite.run(
                  "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, NULL, ?, ?)",
                  [id, `blobs/${id}.bin`, actualBlob.type]
                );
              } else {
                // 通常のテキストデータ → {data: content}でwrap
                let contentToStore: string;
                if (typeof content === 'object' && content !== null) {
                  // Blob分離
                  contentToStore = JSON.stringify(await externalizeBlobsInObject({ data: content }, this.blobStore, id));
                } else {
                  contentToStore = JSON.stringify({ data: content });
                }
                await this.sqlite.run(
                  "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, ?, NULL, ?)",
                  [id, contentToStore, mediaType ?? null]
                );
              }
            } else {
              // 空のファイル
              await this.sqlite.run(
                "INSERT INTO files(id, inlineContent, blobPath, mediaType) VALUES (?, ?, NULL, NULL)",
                [id, JSON.stringify({ data: '' })]
              );
            }
          } else if (type === 'folder') {
            // children
            if (children && Array.isArray(children)) {
              for (let idx = 0; idx < children.length; idx++) {
                const [bindId, name, childId] = children[idx];
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

    for await (let node of this.readNDJSONStream(dataStream)) {
      if (node.blob && typeof node.blob === 'string') {
        // トップレベルのblob:は例外的にblobに変換
        const blob = await this.mediaConverter.dataURLtoBlob(node.blob);
        node.blob = blob;
      } else {
        // 再帰的に {__blob__:...} を Blob に復元
        node = await deserializeBlobs(node, this.mediaConverter);
      }
      batch.push(node);
      count++;
      onProgress(0.1 + 0.8 * (count / lineCount));
      if (batch.length >= batchSize) {
        await saveBatch(batch);
        writtenCount += batch.length;
        batch = [];
        await this.sqlite.persist();
      }
    }
    if (batch.length > 0) {
      await saveBatch(batch);
      await this.sqlite.persist();
      writtenCount += batch.length;
    }

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
  private mediaConverter: MediaConverter;
  constructor(fileSystem: FileSystem, id: NodeId, sqlite: SqlJsAdapter, blobStore: BlobStore, mediaConverter: MediaConverter) {
    super(fileSystem, id);
    this.sqlite = sqlite;
    this.blobStore = blobStore;
    this.mediaConverter = mediaConverter;
  }

  async read(): Promise<any> {
    const file = await this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (!file) {
      return undefined;
    }
    if (file.inlineContent) {
      // FSAFileSystemの通常の形式: JSON文字列でwrapされている
      const json = JSON.parse(file.inlineContent);
      return (await internalizeBlobsInObject(json, this.blobStore)).data;
    }
    return undefined;
  }

  async write(data: any) {
    const toStore = JSON.stringify(await externalizeBlobsInObject({ data }, this.blobStore, this.id));
    console.log('toStore', toStore);
    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      await this.sqlite.run(
        "UPDATE files SET inlineContent = ?, blobPath = NULL WHERE id = ?",
        [toStore, this.id]
      );
    });
    await this.sqlite.persist();
  }

  async readMediaResource(): Promise<MediaResource> {
    const file = await this.sqlite.selectOne("SELECT * FROM files WHERE id = ?", [this.id]);
    if (!file) throw new Error('File not found');

    if (file.inlineContent) {
      return await this.mediaConverter.fromStorable({ content: file.inlineContent, mediaType: file.mediaType });
    }
    if (file.blobPath) {
      const blob = await this.blobStore.read(this.id);
      return await this.mediaConverter.fromStorable({ blob, mediaType: file.mediaType });
    }
    throw new Error('Broken media data or no media content found');
  }

  async writeMediaResource(mediaResource: MediaResource): Promise<void> {
    const record = await this.mediaConverter.toStorable(mediaResource);

    await this.sqlite.transaction(async () => {
      if (!this.sqlite.run) throw new Error('DB not initialized');
      if (record.blob) {
        const blobPath = await this.blobStore.write(this.id, record.blob);
        await this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = ?, mediaType = ? WHERE id = ?",
          [blobPath, record.mediaType ?? null, this.id]
        );
      } else if (record.content) {
        await this.sqlite.run(
          "UPDATE files SET inlineContent = ?, blobPath = NULL, mediaType = ? WHERE id = ?",
          [record.content, record.mediaType ?? null, this.id]
        );
      } else if (record.remote) {
        await this.sqlite.run(
          "UPDATE files SET inlineContent = ?, blobPath = NULL, mediaType = ? WHERE id = ?",
          [JSON.stringify(record.remote), record.mediaType ?? 'remote', this.id] // 'remote' は mediaType の一種として扱う
        );
      } else {
        await this.sqlite.run(
          "UPDATE files SET inlineContent = NULL, blobPath = NULL, mediaType = NULL WHERE id = ?",
          [null, null, null, this.id] // inlineContent, blobPath, mediaType を NULL にする
        );
      }
    });
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
