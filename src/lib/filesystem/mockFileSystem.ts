import { type NodeId, type NodeType, type BindId, Node, File, Folder, FileSystem } from './fileSystem';
import { ulid } from 'ulid';

export class MockFileSystem extends FileSystem {
  files = {}
  root = new MockFolder('/');

  constructor() {
    super();
  }

  async createFile(): Promise<File> {
    const id = ulid();
    const file = new MockFile(id);
    await file.write('');
    this.files[id] = file;
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = ulid();
    const folder = new MockFolder(id);
    this.files[id] = folder;
    return folder;
  }

  async getNode(id: NodeId): Promise<Node> {
    return this.files[id];
  }

  async getRoot(): Promise<Folder> {
    return this.root;
  }
}

export class MockFile extends File {
  content: string;

  constructor(id) {
    super(id);
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
  children: [BindId, string, Node][] = [];

  getType(): NodeType { return 'folder'; }
  asFolder() { return this; }

  constructor(id) {
    super(id);
  }

  async list(): Promise<[BindId, string, Node][]> {
    return this.children;
  }

  async link(name, Node): Promise<BindId> {
    const bindId = ulid() as BindId;
    this.children.push([bindId, name, Node]);
    return bindId;
  }

  async unlink(bindId: BindId): Promise<void> {
    this.children = this.children.filter(([b, _, __]) => b !== bindId);
  }

  async insert(name: string, node: Node, index: number): Promise<BindId> { 
    const bindId = ulid() as BindId;
    this.children.splice(index, 0, [bindId, name, node]);
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<[BindId, string, Node]> {
    // console.log("get", name, this.children);
    return this.children.find(([b, _, __]) => b === bindId);
  }

  async getEntryByName(name: string): Promise<[BindId, string, Node]> {
    // console.log("get", name, this.children);
    return this.children.find(([_, n, __]) => n === name);
  }

  async getEntriesByName(name: string): Promise<[BindId, string, Node][]> {
    // console.log("get", name, this.children);
    return this.children.filter(([_, n, __]) => n === name);
  }
}