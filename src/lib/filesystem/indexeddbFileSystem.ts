import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import type { NodeId, NodeType, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
<<<<<<< HEAD
import { imageToBase64 } from "./../layeredCanvas/saveCanvas";
=======
import { imageToBase64 } from "./../layeredCanvas/tools/saveCanvas";
>>>>>>> rewrite_layeredCanvas
import { saveAs } from 'file-saver';

export class IndexedDBFileSystem extends FileSystem {
  private db: IDBPDatabase<unknown>;

  constructor() {
    super();
  }

  async open() {
    this.db = await openDB('FileSystemDB', 1, {
      async upgrade(db, oldVersion, newVersion, transaction) {
        const store = db.createObjectStore('nodes', { keyPath: 'id' });
        
        const rootId = "/" as NodeId;
        await store.add({ id: rootId, type: 'folder', children: [], attributes: {} });
    
        await transaction.done;
      }
    });
  }

  async createFile(_type: string): Promise<File> {
    return this.createFileWithId(ulid() as NodeId, _type);
  }

  async createFileWithId(id: NodeId, _type: string = 'text'): Promise<File> {
    try {
      const file = new IndexedDBFile(this, id, this.db);
      const tx = this.db.transaction("nodes", "readwrite");
      const store = tx.store;
      await store.add({ id, type: 'file', content: '' });
      await tx.done;
      return file;
    } catch (e) {
      throw e;
    }
  }

  async createFolder(): Promise<Folder> {
    const id = ulid() as NodeId;
    const folder = new IndexedDBFolder(this, id, this.db);
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    await store.add({ id, type: 'folder', children: [], attributes: {} });
    await tx.done;
    return folder;
  }

  async destroyNode(id: NodeId): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    await store.delete(id);
    await tx.done;
  }

  async getNode(id: NodeId): Promise<Node> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(id);
    
    if (value) {
      if (value.type === 'file') {
        const file = new IndexedDBFile(this, value.id, this.db); // Assuming IndexedDBFile class exists
        return file;
      } else if (value.type === 'folder') {
        const folder = new IndexedDBFolder(this,value.id, this.db); // Assuming IndexedDBFolder class exists
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
<<<<<<< HEAD
=======

  async collectTotalSize(): Promise<number> {
    const tx = this.db.transaction("nodes", "readonly");
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
>>>>>>> rewrite_layeredCanvas
  
  async dump(): Promise<void> {
    // すべてのノードを取得
    const allNodes = await this.db.getAll('nodes');
  
    // ノードをJSON形式に変換
    const json = JSON.stringify(allNodes, null, 2);
  
    // ファイルに保存 (file-saverを使用)
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, 'filesystem-dump.json');
  }
  
  async undump(json: string): Promise<void> {
    // ファイルからJSONを読み込む
    const nodes = JSON.parse(json);
  
    // すべてのノードをIndexedDBに保存
    const tx = this.db.transaction('nodes', 'readwrite');
    await tx.store.clear();
    for (const node of nodes) {
      await tx.store.put(node);
    }
    await tx.done;
  }
}

export class IndexedDBFile extends File {
  db: IDBPDatabase;

  constructor(fileSystem: FileSystem, id: NodeId, db: IDBPDatabase) {
    super(fileSystem, id);
    this.db = db;
  }

  async read() {
    const data = await this.db.get('nodes', this.id);
    return data ? data.content : null;
  }

  async write(data) {
    await this.db.put('nodes', { id: this.id, type: 'file', content: data });
  }

  async readImage(): Promise<HTMLImageElement> {
    const content = await this.read();
    const image = new Image();
    image.src = content;
    return image;
  }

  async writeImage(image: HTMLImageElement): Promise<void> {
    await this.write(imageToBase64(image));
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
    const bindId = ulid() as BindId;

    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children.push([bindId, name, nodeId]);
      await store.put(value);
    }

    await tx.done;
    return bindId;
  }

  async unlink(bindId: BindId): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children = value.children.filter(([b, _, __]) => b !== bindId);
      await store.put(value);
    }

    await tx.done;
  }

  async unlinkv(bindIds: BindId[]): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children = value.children.filter(([b, _, __]) => !bindIds.includes(b));
      await store.put(value);
    }

    await tx.done;
  }

  async rename(bindId: BindId, newname: string): Promise<void> {
    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      const entry = value.children.find(([b, _, __]) => b === bindId);
      if (entry) {
        entry[1] = newname;
        await store.put(value);
      }
    }

    await tx.done;
  }

  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> {
    const bindId = ulid() as BindId;

    const tx = this.db.transaction("nodes", "readwrite");
    const store = tx.store;
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children.splice(index, 0, [bindId, name, nodeId]);
      await store.put(value);
    }

    await tx.done;
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<Entry> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.find(([b, _, __]) => b === bindId) : null;
  }

  async getEntryByName(name: string): Promise<Entry> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.find(([_, n, __]) => n === name) : null;
  }

  async getEntriesByName(name: string): Promise<Entry[]> {
    const tx = this.db.transaction("nodes", "readonly");
    const store = tx.store;
    const value = await store.get(this.id);

    return value ? value.children.filter(([_, n, __]) => n === name) : [];
  }
}
