import { type IDBPDatabase, openDB } from 'idb';
import { ulid } from 'ulid';
import { type NodeType, Node, File, Folder, FileSystem } from './fileSystem';

type NodeId = string & { _NodeId: never };

export class IndexedDBFileSystem extends FileSystem {
  dbPromise: Promise<IDBPDatabase>;
  db: IDBPDatabase;

  constructor() {
    super();
    this.init();
  }

  async ready() {
    await this.dbPromise;
  }

  async init() {
    this.dbPromise = openDB('fileSystem', 1, {
      upgrade(db) {
        db.createObjectStore('files', { keyPath: 'id' });
        db.createObjectStore('folders', { keyPath: 'id' });
      },
    });
    this.db = await this.dbPromise;
  }

  async createFile() {
    await this.ready();
    const id = ulid();
    const file = new IndexedDBFile(this.db, id);
    await file.write('');
    return file;
  }

  async createFolder() {
    await this.ready();
    const id = ulid();
    const folder = new IndexedDBFolder(this.db, id);
    await folder.write();
    return folder;
  }

  async getRoot() {
    await this.ready();
    return new IndexedDBFolder(this.db, '/');
  }
}

export class IndexedDBFile extends File {
  db: IDBPDatabase;
  id: NodeId;

  constructor(db, id) {
    super();
    this.db = db;
    this.id = id;
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
  db: IDBPDatabase;
  id: NodeId;
  children: Array<[string, NodeType, NodeId]>; // NodeType冗長だがないとlistが遅くなるので

  constructor(db, id) {
    super();
    this.db = db;
    this.id = id;
    this.children = [];
  }

  async list(): Promise<[string, Node][]> {
    await this.read();
    return this.children.map(c => this.getRef(c));
  }

  async link(name, node) {
    await this.read();
    this.children.push([name, node.getType(), node.id]);
    await this.write();
  }

  async unlink(name) {
    await this.read();
    this.children = this.children.filter(([childName,,]) => childName !== name);
    await this.write();
    // TODO: reference counting
  }

  async get(name) {
    await this.read();
    const child = this.children.find(([childName,,]) => childName === name);
    if (!child) {
      throw new Error(`Node with name ${name} does not exist`);
    }
    return this.getRef(child)[1];
  }

  async read() {
    const folder = await this.db.get('folders', this.id);
    this.children = folder ? folder.children : [];
  }

  async write() {
    await this.db.put('folders', { id: this.id, children: this.children });
  }

  getRef([name, nodeType, nodeId]): [string, Node] {
    if (nodeType === 'file') {
      return [name, new IndexedDBFile(this.db, nodeId)];
    } else if (nodeType === 'folder') {
      return [name, new IndexedDBFolder(this.db, nodeId)];
    } else {
      throw new Error(`Unknown node type ${nodeType}`);
    }
  }
}
