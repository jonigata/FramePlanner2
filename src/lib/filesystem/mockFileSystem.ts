import { Node, File, Folder, FileSystem } from './fileSystem';
import { ulid } from 'ulid';

type NodeId = string & { _NodeId: never };

export class MockFileSystem extends FileSystem {
  root = new MockFolder('/');

  constructor() {
    super();
  }

  async createFile(): Promise<File> {
    const id = ulid();
    const file = new MockFile(id);
    await file.write('');
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = ulid();
    const folder = new MockFolder(id);
    return folder;
  }

  async getRoot(): Promise<Folder> {
    return this.root;
  }
}

export class MockFile extends File {
  id: NodeId;
  content: string;

  constructor(id) {
    super();
    this.id = id;
  }

  async read(): Promise<string> {
    return this.content
  }

  async write(data) {
    this.content = data;
  }
}

export class MockFolder extends Folder {
  id: NodeId;
  children: [string, Node][] = [];

  getType() { return 'folder'; }
  asFolder() { return this; }

  constructor(id) {
    super();
    this.id = id;
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