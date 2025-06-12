import type { NodeId, NodeType, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import { ulid } from 'ulid';

export class MockFileSystem extends FileSystem {
  files: { [key: NodeId]: Node } = {}
  root = new MockFolder(this, '/' as NodeId);

  constructor() {
    super();
  }

  async createFile(type?: string): Promise<File> {
    return this.createFileWithId(ulid() as NodeId, type);
  }

  async createFileWithId(id: NodeId, type?: string): Promise<File> {
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

  async destroyNode(id: NodeId): Promise<void> {
    if (!this.files[id]) {
      throw new Error(`Node ${id} not found`);
    }
    delete this.files[id];    
  }

  async getNode(id: NodeId): Promise<Node | null> {
    return this.files[id] ?? null;
  }

  async getRoot(): Promise<Folder> {
    return this.root;
  }
  
  // FileSystemの抽象メソッドに合わせて未実装throw
  dump(options?: { format?: string; onProgress?: (ratio: number) => void }): Promise<ReadableStream<Uint8Array>> {
    throw new Error('MockFileSystem.dump: Not implemented');
  }

  undump(
    stream: ReadableStream<Uint8Array>,
    options?: { format?: string; onProgress?: (ratio: number) => void }
  ): Promise<void> {
    throw new Error('MockFileSystem.undump: Not implemented');
  }

  // test用
  dumpToString(): string {
    const json = JSON.stringify(Object.values(this.files).map((f: Node) => {
      if (f.getType() === 'file') {
        return (f as MockFile).dump();
      } else {
        return (f as MockFolder).dump();
      }
    }));

    return json;
  }

  undumpFromString(json: string): void {
    this.files = {};
    const files = JSON.parse(json); // array of object
    for (const file of files) {
      const id = file.id;
      if (file.type === 'file') {
        const f = new MockFile(this, id);
        f.undump(file);
        this.files[id] = f;
      } else {
        const f = new MockFolder(this, id);
        f.children = file.children;
        this.files[id] = f;
      }
    }
    this.root = this.files['/' as NodeId] as MockFolder;
  }

  getFileSystemName(): string {
    return 'MockFileSystem';
  }
}

export class MockFile extends File {
  data: any;

  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  getType(): NodeType { return 'file'; }
  asFile() { return this; }

  async read(): Promise<string> {
    return this.data.content;
  }

  async write(data: string) {
    this.data.content = data;
  }

  // Fileインターフェイス追加分
  async readMediaResource(): Promise<any> {
    throw new Error('MockFile.readMediaResource: Not implemented');
  }
  async writeMediaResource(_mediaResource: any): Promise<void> {
    throw new Error('MockFile.writeMediaResource: Not implemented');
  }
  async readBlob(): Promise<Blob> {
    throw new Error('MockFile.readBlob: Not implemented');
  }
  async writeBlob(_blob: Blob): Promise<void> {
    throw new Error('MockFile.writeBlob: Not implemented');
  }

  dump() {
    return { ...this.data, id: this.id, type: 'file' }; // 念の為idとtypeは上書き
  }

  undump(data: any) {
    this.data = data;
  }
}

export class MockFolder extends Folder {
  children: Entry[] = [];
  private attributes: { [key: string]: string } = {};

  getType(): NodeType { return 'folder'; }
  asFolder() { return this; }

  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  async setAttribute(key: string, value: string): Promise<void> {
    this.attributes[key] = value;
  }
  async getAttribute(key: string): Promise<string | null> {
    return this.attributes[key] ?? null;
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

  async unlinkv(bindIds: BindId[]): Promise<void> {
    for (const bindId of bindIds) {
      await this.unlink(bindId);
    }
  }

  async rename(bindId: BindId, newname: string): Promise<void> {
    const entry = this.children.find(([b]) => b === bindId);
    if (entry) {
      entry[1] = newname;
    }
  }

  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> {
    const bindId = ulid() as BindId;
    this.children.splice(index, 0, [bindId, name, nodeId]);
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<Entry | null> {
    return this.children.find(([b, _, __]) => b === bindId) ?? null;
  }

  async getEntryByName(name: string): Promise<Entry | null> {
    return this.children.find(([_, n, __]) => n === name) ?? null;
  }

  async getEntriesByName(name: string): Promise<Entry[]> {
    return this.children.filter(([_, n, __]) => n === name);
  }

  async getBindId(nodeId: NodeId): Promise<BindId | null> {
    const entry = this.children.find(([_, __, id]) => id === nodeId);
    if (entry) {
      return entry[0];
    }
    return null;
  }

  dump() {
    return { id: this.id, type: 'folder', children: this.children, attributes: this.attributes };
  }
}