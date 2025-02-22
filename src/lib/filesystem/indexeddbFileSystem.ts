import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import type { NodeId, NodeType, BindId, Entry, RemoteMediaReference, MediaResource } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { saveAs } from 'file-saver';
import { createCanvasFromBlob, createCanvasFromImage, createVideoFromBlob, canvasToBlob } from '../layeredCanvas/tools/imageUtil';

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
  
  async dump(progress: (n: number)=>void): Promise<void> {
    const tx = this.db!.transaction("nodes", "readonly");
    const store = tx.store;
    let cursor = await store.openCursor();
    
    const items: any[] = [];
    progress(0);
    while (cursor) {
      items.push(cursor.value);
      cursor = await cursor.continue();
    }
    progress(0.1);
    
    await tx.done;
    
    // ループ中の進捗をリアルタイムに反映させるなら
    // await new Promise((r) => setTimeout(r, 0)) を適宜挟む
    const chunks: Uint8Array[] = [];
    const encoder = new TextEncoder();
    
    let count = 0;
    for (const value of items) {
      if (value.blob) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject();
          reader.readAsDataURL(value.blob);
        });
        value.blob = dataUrl;
      }
    
      const jsonString = JSON.stringify(value) + "\n";
      chunks.push(encoder.encode(jsonString));
    
      count++;
      progress(0.1 + 0.8 * (count / items.length));
    
      // 適宜小休止
      if (count % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    
    const blob = new Blob(chunks, { type: "application/x-ndjson" });
    saveAs(blob, "filesystem-dump.ndjson");
    progress(1);
  }
  
  async undump(blob: Blob): Promise<void> {
    console.log("Start undump");
  
    {
      const tx = this.db!.transaction('nodes', 'readwrite');
      const store = tx.objectStore('nodes');
      await store.clear();
      await tx.done;  // ここでトランザクション確実に終了
    }
  
    const stream = blob.stream();
    const nodes = readNDJSONStream(stream);
  
    let allItems: any[] = [];
    let count = 0;
  
    console.log("Start processing nodes");
    for await (const node of nodes) {
      // Base64からBlobを復元（トランザクション外）
      if (node.blob) {
        const res = await fetch(node.blob);
        node.blob = await res.blob();
      }
      allItems.push(node);
      count++;
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

  async getAttribute(key: string): Promise<string> {
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

  async getEntry(bindId: BindId): Promise<Entry> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.find(([b, _, __]: [BindId, unknown, unknown]) => b === bindId) : null;
  }

  async getEntryByName(name: string): Promise<Entry> {
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
