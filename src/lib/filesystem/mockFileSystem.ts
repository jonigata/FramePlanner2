import { type NodeId, type NodeType, Node, File, Folder, FileSystem } from './fileSystem';
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
    console.log(id);
    console.log(this.files);
    console.log(this.files[id]);
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
  children: [string, Node][] = [];

  getType(): NodeType { return 'folder'; }
  asFolder() { return this; }

  constructor(id) {
    super(id);
  }

  async list(): Promise<[string, Node][]> {
    return this.children;
  }

  async link(name, Node): Promise<void> {
    this.children.push([name, Node]);
  }

  async unlink(name): Promise<void> {
    this.children = this.children.filter(([n, _]) => n !== name);
  }

  async get(name): Promise<Node> {
    // console.log("get", name, this.children);
    const child = this.children.find(([n, _]) => n === name);
    return child ? child[1] : null;
  }

}