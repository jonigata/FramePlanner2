import type { NodeId, NodeType, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { ulid } from 'ulid';

export class MockFileSystem extends FileSystem {
  files = {}
  root = new MockFolder(this, '/' as NodeId);

  constructor() {
    super();
  }

  async createFile(_type: string): Promise<File> {
    return this.createFileWithId(ulid() as NodeId, _type);
  }

  async createFileWithId(id: NodeId, _type: string): Promise<File> {
    const file = new MockFile(this, id);
    await file.write('');
    this.files[id] = file;
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = ulid() as NodeId;
    const folder = new MockFolder(this, id);
    this.files[id] = folder;
    return folder;
  }

  async getNode(id: NodeId): Promise<Node> {
    if (!this.files[id]) {
      throw new Error(`Node ${id} not found`);
    }
    return this.files[id];
  }

  async getRoot(): Promise<Folder> {
    return this.root;
  }
}

export class MockFile extends File {
  content: string;

  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  getType(): NodeType { return 'file'; }
  asFile() { return this; }

  async read(): Promise<string> {
    return this.content
  }

  async write(data) {
    this.content = data;
  }
}

export class MockFolder extends Folder {
  children: Entry[] = [];

  getType(): NodeType { return 'folder'; }
  asFolder() { return this; }

  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  async list(): Promise<Entry[]> {
    return this.children;
  }

  async link(name: string, nodeId: NodeId): Promise<BindId> {
    const bindId = ulid() as BindId;
    this.children.push([bindId, name, nodeId]);
    return bindId;
  }

  async unlink(bindId: BindId): Promise<void> {
    this.children = this.children.filter(([b, _, __]) => b !== bindId);
  }

  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> { 
    const bindId = ulid() as BindId;
    this.children.splice(index, 0, [bindId, name, nodeId]);
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<Entry> {
    // console.log("get", name, this.children);
    return this.children.find(([b, _, __]) => b === bindId);
  }

  async getEntryByName(name: string): Promise<Entry> {
    // console.log("get", name, this.children);
    return this.children.find(([_, n, __]) => n === name);
  }

  async getEntriesByName(name: string): Promise<Entry[]> {
    // console.log("get", name, this.children);
    return this.children.filter(([_, n, __]) => n === name);
  }
}