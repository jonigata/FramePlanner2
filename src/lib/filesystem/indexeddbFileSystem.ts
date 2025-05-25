import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import type { NodeId, NodeType, BindId, Entry, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import type { DumpFormat, DumpProgress } from './fileSystem';
import type { MediaConverter } from './mediaConverter';
import { sleep } from '../layeredCanvas/tools/misc';
import { countLines } from './fileSystemTools';


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
  public readonly mediaConverter: MediaConverter;

  constructor(mediaConverter: MediaConverter) {
    super();
    this.mediaConverter = mediaConverter;
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
  
  async dump(options?: { format?: DumpFormat; onProgress?: DumpProgress }): Promise<ReadableStream<Uint8Array>> {
    const onProgress = options?.onProgress ?? (() => {});
    const tx = this.db!.transaction("nodes", "readonly");
    const store = tx.store;
    let cursor = await store.openCursor();

    const items: any[] = [];
    onProgress(0);
    while (cursor) {
      items.push(cursor.value);
      cursor = await cursor.continue();
    }
    onProgress(0.1);

    await tx.done;

    // ストリームで逐次出力
    const encoder = new TextEncoder();
    let count = -1; // ヘッダ行を含めるため-1から開始
    const total = items.length;
    const mediaConverter = this.mediaConverter; // クロージャのためにmediaConverterをキャプチャ

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (count === -1) {
          // ヘッダ行を出力
          const header = { version: "v1", lineCount: total };
          const headerString = JSON.stringify(header) + "\n";
          controller.enqueue(encoder.encode(headerString));
          count = 0;
          return;
        }
        
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
      }
    });

    return stream;
  }
  
  async undump(
    stream: ReadableStream<Uint8Array>,
    options?: { onProgress?: DumpProgress }
  ): Promise<void> {
    const onProgress = options?.onProgress ?? (() => {});
    console.log("Start undump");
    onProgress(0);

    {
      const tx = this.db!.transaction('nodes', 'readwrite');
      const store = tx.objectStore('nodes');
      await store.clear();
      await tx.done;  // ここでトランザクション確実に終了
    }

    const [counterStream, dataStream] = stream.tee();
    const countResult = await countLines(counterStream);
    console.log(`Count result:`, countResult);

    // ヘッダがある場合はheaderLineCountを使用、ない場合は全行数を使用
    const expectedLineCount = countResult.hasHeader ? countResult.headerLineCount! : countResult.lineCount;

    // streamは一度しか読めないので再度取得
    // Blobのときはstreamを複製できるが、ここでは一度しか読まない前提
    const nodes = readNDJSONStream(dataStream); // async generator

    let allItems: any[] = [];
    let count = 0;
    let isFirstLine = true;

    console.log("Start processing nodes");
    for await (let node of nodes) {
      // 最初の行がヘッダかどうかをチェック
      if (isFirstLine) {
        isFirstLine = false;
        if (countResult.hasHeader) {
          // ヘッダ行の場合、スキップ
          console.log(`Skipping header line`);
          continue;
        }
        // ヘッダでない場合は通常のノードとして処理
      }

      if (node.blob && typeof node.blob === 'string') {
        // トップレベルのblob:は例外的にblobに変換
        const blob = await this.mediaConverter.dataURLtoBlob(node.blob);
        node.blob = blob;
      } else {
        // 再帰的に {__blob__:...} を Blob に復元
        node = await deserializeBlobs(node, this.mediaConverter);
      }
      allItems.push(node);
      count++;
      onProgress(0.1 + 0.8 * (count / expectedLineCount));
    }
    console.log(`Loaded ${count} nodes in memory`);

    // 3) バッチ単位で write (複数のトランザクションを使う)
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
        console.log(`Processing ${writtenCount + batch.length} / ${count}...`);
        await saveBatch(batch);
        writtenCount += batch.length;
        batch = [];
        console.log("Processed batch");
      }
    }

    // 最後のバッチがあれば保存
    if (batch.length > 0) {
      console.log(`Processing final ${writtenCount + batch.length} / ${count}...`);
      await saveBatch(batch);
      writtenCount += batch.length;
      console.log("Processed final batch");
    }

    console.log(`Processed ${writtenCount} nodes in total`);
    onProgress(1);
  }
}
  
export class IndexedDBFile extends File {
  db: IDBPDatabase;
  private readonly mediaConverter: MediaConverter;

  constructor(fileSystem: FileSystem, id: NodeId, db: IDBPDatabase) {
    super(fileSystem, id);
    this.db = db;
    // fileSystemは必ずIndexedDBFileSystem型
    this.mediaConverter = (fileSystem as IndexedDBFileSystem).mediaConverter;
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
    return await this.mediaConverter.fromStorable(data);
  }

  async writeMediaResource(mediaResource: MediaResource): Promise<void> {
    const record = await this.mediaConverter.toStorable(mediaResource);
    await this.db.put('nodes', { id: this.id, type: 'file', ...record });
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
