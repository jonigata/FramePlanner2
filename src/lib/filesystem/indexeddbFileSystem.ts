import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import { type BindId, type NodeId, type NodeType, Node, File, Folder, FileSystem } from './fileSystem';

export class IndexedDBFileSystem extends FileSystem {
  private db: IDBPDatabase<unknown>;

  constructor() {
    super();
  }

  async open() {
    this.db = await openDB('FileSystemDB', 1, {
      upgrade(db) {
        db.createObjectStore('nodes', { keyPath: 'id' });
        db.createObjectStore('files', { keyPath: 'id' });
        db.createObjectStore('folders', { keyPath: 'id' });
      }
    });
  }

  async createFile(): Promise<File> {
    const id = ulid();
    const file = new IndexedDBFile(id, this.db);
    await file.write('');
    const transaction = this.db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    store.add({ id, type: 'file', content: '' });
    await transaction.done;
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = ulid();
    const folder = new IndexedDBFolder(id, this.db);
    const transaction = this.db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    store.add({ id, type: 'folder', children: [] });
    await transaction.done;
    return folder;
  }

  async getNode(id: NodeId): Promise<Node> {
    const transaction = this.db.transaction("nodes", "readonly");
    const store = transaction.objectStore("nodes");
    const value = await store.get(id);
    
    if (value) {
      if (value.type === 'file') {
        const file = new IndexedDBFile(value.id, this.db); // Assuming IndexedDBFile class exists
        return file;
      } else if (value.type === 'folder') {
        const folder = new IndexedDBFolder(value.id, this.db); // Assuming IndexedDBFolder class exists
        return folder;
      }
    }
    return null;
  }

  async getRoot(): Promise<Folder> {
    // Assuming root folder ID is known or is a constant
    const rootId = "root" as NodeId;
    return this.getNode(rootId) as Promise<Folder>;
  }
}

export class IndexedDBFile extends File {
  db: IDBPDatabase;

  constructor(db, id) {
    super(id);
    this.db = db;
  }

  async read() {
    const data = await this.db.get('files', this.id);
    return data ? data.content : null;
  }

  async write(data) {
    await this.db.put('files', { id: this.id, content: data });
  }
}

export class IndexedDBFolder extends Folder {
  private db: IDBPDatabase<unknown>;

  constructor(id: NodeId, db: IDBPDatabase<unknown>) {
    super(id);
    this.db = db;
  }

  getType(): NodeType {
    return 'folder';
  }

  asFolder() {
    return this;
  }

  async list(): Promise<[BindId, string, Node][]> {
    const transaction = this.db.transaction("nodes", "readonly");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    return value ? value.children : [];
  }

  async link(name: string, Node: Node): Promise<BindId> {
    const bindId = ulid() as BindId;

    const transaction = this.db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children.push([bindId, name, Node]);
      store.put(value);
    }

    await transaction.done;
    return bindId;
  }

  async unlink(bindId: BindId): Promise<void> {
    const transaction = this.db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children = value.children.filter(([b, _, __]) => b !== bindId);
      store.put(value);
    }

    await transaction.done;
  }

  async insert(name: string, node: Node, index: number): Promise<BindId> {
    const bindId = ulid() as BindId;

    const transaction = this.db.transaction("nodes", "readwrite");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    if (value && Array.isArray(value.children)) {
      value.children.splice(index, 0, [bindId, name, node]);
      store.put(value);
    }

    await transaction.done;
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<[BindId, string, Node]> {
    const transaction = this.db.transaction("nodes", "readonly");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    return value ? value.children.find(([b, _, __]) => b === bindId) : null;
  }

  async getEntryByName(name: string): Promise<[BindId, string, Node]> {
    const transaction = this.db.transaction("nodes", "readonly");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    return value ? value.children.find(([_, n, __]) => n === name) : null;
  }

  async getEntriesByName(name: string): Promise<[BindId, string, Node][]> {
    const transaction = this.db.transaction("nodes", "readonly");
    const store = transaction.objectStore("nodes");
    const value = await store.get(this.id);

    return value ? value.children.filter(([_, n, __]) => n === name) : [];
  }
}
