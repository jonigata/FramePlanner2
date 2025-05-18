import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import type { NodeId, NodeType, BindId, Entry, RemoteMediaReference, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { createCanvasFromBlob, createCanvasFromImage, createVideoFromBlob, canvasToBlob } from '../layeredCanvas/tools/imageUtil';
import type { DumpFormat, DumpProgress } from './fileSystem';

/**
 * BlobをdataURLへ変換
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * オブジェクト内のすべてのBlobをdataURLラッパー({__blob__:true,data:...})に再帰的に変換
 */
async function serializeBlobs(obj: any): Promise<any> {
  if (obj instanceof Blob) {
    return { __blob__: true, data: await blobToDataURL(obj), type: obj.type };
  }
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(serializeBlobs));
  }
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = await serializeBlobs(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * dataURLラッパー({__blob__:true,data:...})をBlobに再帰的に変換
 */
async function deserializeBlobs(obj: any): Promise<any> {
  if (obj && obj.__blob__ && obj.data) {
    const res = await fetch(obj.data);
    return await res.blob();
  }
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(deserializeBlobs));
  }
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = await deserializeBlobs(obj[key]);
    }
    return result;
  }
  return obj;
}

async function countLines(stream: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let lineCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      lineCount += chunk.split('\n').length - 1;
    }
  } finally {
    reader.releaseLock();
  }

  return lineCount;
}

async function* readNDJSONStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<any, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lineNumber = 0;

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
        lineNumber++;
        console.log(`Processing line ${lineNumber}`);
        yield JSON.parse(line);
        // 次の検索開始位置を更新
        start = newlineIndex + 1;
        // バッファをクリア
        buffer = '';
      }

      // 最後の改行以降の部分をバッファに保持
      buffer += chunk.slice(start);
    }
  } finally {
    reader.releaseLock();
  }
}


export class IndexedDBFileSystem extends FileSystem {
  private db: IDBPDatabase<unknown> | null = null;

  constructor() {
    super();
  }

  async open(dbname: string = 'FileSystemDB'): Promise<void> {
    this.db = await openDB(dbname, 2, {
      async upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          const nodesStore = db.createObjectStore('nodes', { keyPath: 'id' });
          
          const rootId = "/" as NodeId;
          await nodesStore.add({ id: rootId, type: 'folder', children: [], attributes: {} });
        }
  
        if (oldVersion < 2) {
          // 巨大ファイル対応
          // 'metadata'storeを追加して、ファイルのメタデータを保存する

          const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
        }
  
        await transaction.done;
      }
    });
  }

  async createFile(_type: string): Promise<File> {
    return this.createFileWithId(ulid() as NodeId, _type);
  }

  async createFileWithId(id: NodeId, _type: string = 'text'): Promise<File> {
    const file = new IndexedDBFile(this, id, this.db!);
    const tx = this.db!.transaction(["nodes","metadata"], "readwrite");
    const store = tx.objectStore('nodes');
    const metadataStore = tx.objectStore('metadata');
    await store.add({ id, type: 'file', content: '' });
    await metadataStore.add({ key: id, type: 'file', filesize: 0 });
    await tx.done;
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = ulid() as NodeId;
    const folder = new IndexedDBFolder(this, id, this.db!);
    const tx = this.db!.transaction(["nodes","metadata"], "readwrite");
    const store = tx.objectStore('nodes');
    const metadataStore = tx.objectStore('metadata');
    await store.add({ id, type: 'folder', children: [], attributes: {} });
    await metadataStore.add({ key: id, type: 'folder', filesize: 0 });
    await tx.done;
    return folder;
  }

  async destroyNode(id: NodeId): Promise<void> {
    const tx = this.db!.transaction(["nodes","metadata"], "readwrite");
    const store = tx.objectStore('nodes');
    const metadataStore = tx.objectStore('metadata');
    await store.delete(id);
    await metadataStore.delete(id);
    await tx.done;
  }

  async getNode(id: NodeId): Promise<Node | null> {
    // NOTE: 
    // 多分頑張ればそもそもメタデータもとらないようにできると思うが、
    // どの程度寄与するか不明な上修正範囲が広いのでやらない

    // メタデータがあればそこから
    const metadata = await this.db!.get('metadata', id);
    if (metadata) {
      if (metadata.type === 'file') {
        const file = new IndexedDBFile(this, id, this.db!); // Assuming IndexedDBFile class exists
        return file;
      } else if (metadata.type === 'folder') {
        const folder = new IndexedDBFolder(this, id, this.db!); // Assuming IndexedDBFolder class exists
        return folder;
      }
    }

    // ファイルが大きいと遅い
    const value = await this.db!.get('nodes', id);
    if (value) {
      const filesize = value.content ? value.content.length : value.blob ? value.blob.size : 0;
      await this.db!.put('metadata', { key: id, type: value.type, filesize });
      if (value.type === 'file') {
        const file = new IndexedDBFile(this, value.id, this.db!); // Assuming IndexedDBFile class exists
        return file;
      } else if (value.type === 'folder') {
        const folder = new IndexedDBFolder(this,value.id, this.db!); // Assuming IndexedDBFolder class exists
        return folder;
      }
    }

    return null;
  }

  async getRoot(): Promise<Folder> {
    // Assuming root folder ID is known or is a constant
    const rootId = "/" as NodeId;
    return this.getNode(rootId) as Promise<Folder>;
  }

  async collectTotalSize(): Promise<number> {
    const tx = this.db!.transaction("nodes", "readonly");
    const store = tx.store;
    let cursor = await store.openCursor();
    let total = 0;
    while (cursor) {
      const value = cursor.value;
      if (value.type === 'file') {
        let filesize = 0;
        if (value.content !== undefined) {
          if (typeof value.content === 'string') {
            filesize = value.content.length;
          } else {
            filesize = 0;
          }
        } else if (value.blob !== undefined) {
          filesize = value.blob.size;
        } else if (value.remote !== undefined) {
          filesize = 0;
        } else {
          console.log(`unknown type: ${JSON.stringify(value)}`);
        }
        total += filesize;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
    console.log(`Total size: ${total}`);
    return total;
  }
  
  /**
   * ファイルシステム全体を ReadableStream で書き出す
   */
  async dump(options?: { format?: DumpFormat; onProgress?: DumpProgress }): Promise<ReadableStream<Uint8Array>> {
    const format = options?.format ?? 'ndjson/v1';
    const onProgress = options?.onProgress ?? (() => {});
    if (format !== 'ndjson/v1') throw new Error(`unsupported format: ${format}`);

    const total = await this.db!.count('nodes');
    onProgress(0);

    const { readable, writable } = new TransformStream<Uint8Array>();
    // 非同期で書き込み
    this._internalDump(writable.getWriter(), total, onProgress)
      .catch(e => { console.error('dump failed', e); writable.getWriter().close(); });

    return readable;
  }

  private async _internalDump(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    total: number,
    onProgress: DumpProgress
  ) {
    const encoder = new TextEncoder();
    let read = 0;
    const batchSize = 1000;
    let tx = this.db!.transaction("nodes", "readonly");
    let store = tx.store;
    let cursor = await store.openCursor();

    // まず全ノードをバッファに集める
    const nodesArr: any[] = [];
    while (cursor) {
      nodesArr.push(cursor.value);
      cursor = await cursor.continue();
    }

    // 1. nodesテーブル
    for (const node of nodesArr) {
      const nodeRec: any = {
        table: "nodes",
        id: node.id,
        type: node.type,
        attributes: JSON.stringify(node.attributes ?? {})
      };
      await writer.write(encoder.encode(JSON.stringify(nodeRec) + "\n"));
      read++;
      onProgress(read / total);
    }

    // 2. childrenテーブル
    for (const node of nodesArr) {
      if (node.type === "folder" && Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
          const [bindId, name, childId] = node.children[i];
          const childRec = {
            table: "children",
            parentId: node.id,
            bindId,
            name,
            childId,
            idx: i
          };
          await writer.write(encoder.encode(JSON.stringify(childRec) + "\n"));
          read++;
          onProgress(read / total);
        }
      }
    }

    // 3. filesテーブル
    for (const node of nodesArr) {
      if (node.type === "file") {
        let fileRec: any = {
          table: "files",
          id: node.id,
          mediaType: node.mediaType ?? null
        };
        // content or blob
        if (typeof node.content === "string" && node.content.length > 0) {
          fileRec.inlineContent = node.content;
        }
        if (node.blob) {
          // BlobをDataURL化
          fileRec.blob = await blobToDataURL(node.blob);
        }
        await writer.write(encoder.encode(JSON.stringify(fileRec) + "\n"));
        read++;
        onProgress(read / total);
      }
    }

    await tx.done;
    await writer.close();
    onProgress(1);
  }

  /**
   * ReadableStream から復元
   */
  async undump(
    stream: ReadableStream<Uint8Array>,
    options?: { format?: DumpFormat; onProgress?: DumpProgress }
  ): Promise<void> {
    const format = options?.format ?? 'ndjson/v1';
    const onProgress = options?.onProgress ?? (() => {});
    if (format !== 'ndjson/v1') throw new Error(`unsupported format: ${format}`);

    await this._internalUndump(stream, onProgress);
  }

  private async _internalUndump(
    stream: ReadableStream<Uint8Array>,
    onProgress: DumpProgress
  ) {
    onProgress(0);

    {
      const tx = this.db!.transaction('nodes', 'readwrite');
      const store = tx.objectStore('nodes');
      await store.clear();
      await tx.done;
    }

    // tee は一度だけ呼び出して 2 つのブランチを得る
    const [countBranch, parseBranch] = stream.tee();

    // 行数カウント
    const lineCount = await countLines(countBranch);
    const nodes = readNDJSONStream(parseBranch); // async generator

    let allItems: any[] = [];
    let count = 0;

    for await (const raw of nodes) {
      const node = await deserializeBlobs(raw);
      allItems.push(node);
      count++;
      onProgress(0.1 + 0.8 * (count / lineCount));
    }

    const batchSize = 1000;
    let batch: any[] = [];
    let writtenCount = 0;

    const saveBatch = async (itemsBatch: any[]) => {
      const tx = this.db!.transaction('nodes', 'readwrite');
      const store = tx.objectStore('nodes');
      for (const item of itemsBatch) {
        await store.put(item);
      }
      await tx.done;

      // metadata
      const metadataTx = this.db!.transaction('metadata', 'readwrite');
      const metadataStore = metadataTx.objectStore('metadata');
      for (const item of itemsBatch) {
        const filesize = item.content?.length ?? item.blob?.size ?? 0;
        await metadataStore.put({ key: item.id, type: item.type, filesize });
      }
    };

    for (const node of allItems) {
      batch.push(node);
      if (batch.length >= batchSize) {
        await saveBatch(batch);
        writtenCount += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await saveBatch(batch);
      writtenCount += batch.length;
    }

    onProgress(1);
  }
}
  
export class IndexedDBFile extends File {
  db: IDBPDatabase;

  constructor(fileSystem: FileSystem, id: NodeId, db: IDBPDatabase) {
    super(fileSystem, id);
    this.db = db;
  }

  async read(): Promise<any> {
    const data = await this.db.get('nodes', this.id);
    return data ? data.content : null;
  }

  async write(data: any) {
    await this.db.put('nodes', { id: this.id, type: 'file', content: data });
  }

  async readMediaResource(): Promise<MediaResource> {
    const data = await this.db.get('nodes', this.id)!;
    if (data.remote) {
      return data.remote as RemoteMediaReference;
    }

    if (data.blob) {
      if (data.mediaType === 'image' || data.mediaType === undefined) {
        const canvas = await createCanvasFromBlob(data.blob);
        return canvas;
      }
      if (data.mediaType === 'video') {
        const video = await createVideoFromBlob(data.blob);
        return video;
      }
      throw new Error('Unknown media type');
    } else if (data.content) {
      const image = new Image();
      image.src = data.content;
      await image.decode();
      const canvas = await createCanvasFromImage(image);
      return canvas;      
    } else {
      throw new Error('Broken media data');
    }
  }

  async writeMediaResource(mediaResource: MediaResource): Promise<void> {
    console.log("writeMediaResource", mediaResource);
    if (mediaResource instanceof HTMLCanvasElement) {
      const blob = await canvasToBlob(mediaResource);
      await this.db.put('nodes', { id: this.id, type: 'file', blob, mediaType: 'image' });
    } else if (mediaResource instanceof HTMLVideoElement) {
      // video.srcからblobを取得
      const blob = await fetch(mediaResource.src).then(res => res.blob());
      await this.db.put('nodes', { id: this.id, type: 'file', blob, mediaType: 'video' });
    } else {
      await this.db.put('nodes', { id: this.id, type: 'file', remote: mediaResource });
    }
  }

  async readBlob(): Promise<Blob> {
    // 現状envelope格納専用のため
    throw new Error('Not implemented');
  }

  async writeBlob(blob: Blob): Promise<void> {
    // 現状envelope格納専用のため
  }
}

export class IndexedDBFolder extends Folder {
  private db: IDBPDatabase<unknown>;

  constructor(fileSystem: FileSystem, id: NodeId, db: IDBPDatabase) {
    super(fileSystem, id);
    this.db = db;
  }

  getType(): NodeType {
    return 'folder';
  }

  asFolder() {
    return this;
  }

  async setAttribute(key: string, value: string): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const data = await store.get(this.id);
    if (data) {
      data.attributes[key] = value;
      await store.put(data);
    }
    await tx.done;
  }

  async getAttribute(key: string): Promise<string | null> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const data = await store.get(this.id);
    await tx.done;
    return data ? data.attributes[key] : null;
  }

  async list(): Promise<Entry[]> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children : [];
  }

  async link(name: string, nodeId: NodeId): Promise<BindId> {
    return await this.insert(name, nodeId, -1);
  }

  async unlink(bindId: BindId): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    const oldLength = value.children.length;
    value.children = value.children.filter(([b, _, __]: [BindId, unknown, unknown]) => b !== bindId);
    const newLength = value.children.length;
    if (oldLength !== newLength) {
      console.log(`Unlinked ${bindId}`);
    } else {
      console.log(`Failed to unlink ${bindId}`);
    }
    await store.put(value);

    super.notifyDelete(bindId);

    await tx.done;
  }

  async unlinkv(bindIds: BindId[]): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    value.children = value.children.filter(([b, _, __]: [BindId, unknown, unknown]) => !bindIds.includes(b));
    await store.put(value);

    for (const bindId of bindIds) {
      super.notifyDelete(bindId);
    }

    await tx.done;
  }

  async rename(bindId: BindId, newname: string): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    const entry = value.children.find(([b, _, __]: [BindId, unknown, unknown]) => b === bindId);
    if (entry) {
      entry[1] = newname;
      await store.put(value);
    }

    super.notifyRename(bindId, newname);

    await tx.done;
  }

  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> {
    const bindId = ulid() as BindId;

    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    if (index < 0) {
      index = value.children.length;
    }
    value.children.splice(index, 0, [bindId, name, nodeId]);
    await store.put(value);

    super.notifyInsert(bindId, index, null);

    await tx.done;
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<Entry | null> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.find(([b, _, __]: [BindId, unknown, unknown]) => b === bindId) : null;
  }

  async getEntryByName(name: string): Promise<Entry | null> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.find(([_, n, __]: [unknown, string, unknown]) => n === name) : null;
  }

  async getEntriesByName(name: string): Promise<Entry[]> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.filter(([_, n, __]: [unknown, string, unknown]) => n === name) : [];
  }

}
