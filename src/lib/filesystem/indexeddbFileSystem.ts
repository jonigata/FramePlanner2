import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import type { NodeId, NodeType, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { saveAs } from 'file-saver';

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

  async open() {
    this.db = await openDB('FileSystemDB', 2, {
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
      await this.db!.put('metadata', { key: id, type: value.type, filesize: value.content?.length });
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
      if (cursor.value.type === 'file') {
        total += cursor.value.content.length;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
    return total;
  }
  
  async dump(): Promise<void> {
    const tx = this.db!.transaction("nodes", "readonly");
    const store = tx.store;
    let cursor = await store.openCursor();
  
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        while (cursor) {
          const jsonString = JSON.stringify(cursor.value) + '\n'; // NDJSON用に改行を追加
          controller.enqueue(encoder.encode(jsonString));
          cursor = await cursor.continue();
        }
  
        controller.close();
      }
    });
  
    const response = new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' }
    });
  
    const blob = await response.blob();
    saveAs(blob, 'filesystem-dump.ndjson'); // 拡張子を.ndjsonに変更
  }

  async undump(blob: Blob): Promise<void> {
    const batchSize = 1000;
    const stream = blob.stream();
    const nodes = readNDJSONStream(stream);
    
    console.log('Start undump');
    await this.db!.transaction('nodes', 'readwrite')
      .objectStore('nodes')
      .clear();

    let batch: any[] = [];
    let count = 0;

    const saveBatch =  async (batch: any[]) => {
      const tx = this.db!.transaction('nodes', 'readwrite');
      const store = tx.objectStore('nodes');

      for (const node of batch) {
        await store.put(node);
      }

      await tx.done;
    }

    console.log('Start processing nodes');
    for await (const node of nodes) {
      console.log(node);
      batch.push(node);
      count++;

      if (batch.length >= batchSize) {
        console.log(`Processing ${count} nodes`);
        await saveBatch.call(this, batch);
        batch = [];
        console.log(`Processed`);
      }
    }

    // 残りのノードを保存
    if (batch.length > 0) {
      await saveBatch.call(this, batch);
      console.log(`Processed ${count} nodes in total`);
    }
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

  async readCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    this.read().then(async (content) => {
      const image = new Image();
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(image, 0, 0);
      }
      image.src = content;
    });
    return canvas;
  }

  async writeCanvas(canvas: HTMLCanvasElement): Promise<void> {
    await this.write(canvas.toDataURL("image/png"));
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

    value.children = value.children.filter(([b, _, __]: [BindId, unknown, unknown]) => b !== bindId);
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
