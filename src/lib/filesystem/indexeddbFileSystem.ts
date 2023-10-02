import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import type { NodeId, NodeType, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';

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
        await store.add({ id: rootId, type: 'folder', children: [] });
    
        await transaction.done;
      }
    });
  }

  async createFile(): Promise<File> {
    try {
      const id = ulid() as NodeId;
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
    await store.add({ id, type: 'folder', children: [] });
    await tx.done;
    return folder;
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
      store.put(value);
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
      store.put(value);
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
      store.put(value);
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
