import { ulid } from 'ulid';

export type NodeType = 'file' | 'folder';
export type NodeId = string & { _NodeId: never };
export type BindId = string & { _BindId: never };
export type FileSystemId = string & { _FileSystemId: never };

export type Entry = [BindId, string, NodeId];
export type EmbodiedEntry = [BindId, string, Node];

export class FileSystem {
  id: FileSystemId;

  constructor() {
    this.id = ulid() as FileSystemId;
  }

  async createFile(type: string = 'text'): Promise<File> { throw 'not implemented'; }
  async createFileWithId(id: NodeId, type: string = 'text'): Promise<File> { throw 'not implemented'; }
  async createFolder(): Promise<Folder> { throw 'not implemented'; }
  async destroyNode(id: NodeId): Promise<void> { throw 'not implemented'; }

  async getNode(id: NodeId): Promise<Node> { throw 'not implemented'; }

  async getRoot(): Promise<Folder> { throw 'not implemented'; }

  async collectTotalSize(): Promise<number> { throw 'not implemented'; }
}

export class Node {
  fileSystem: FileSystem;
  id: NodeId

  constructor(fileSystem: FileSystem, id: NodeId) { 
    this.fileSystem = fileSystem;
    this.id = id; 
  }
  getType(): NodeType { return null; }
  asFile(): File { return null; }
  asFolder() : Folder { return null; }

  async getNodeByPath(path: string): Promise<Node> {
    if (path === '') {
      return this;
    }
    const [name, ...rest] = path.split('/');
    const folder = await this.asFolder().getNodeByName(name);
    return folder.getNodeByPath(rest.join('/'));
  }
}

export class File extends Node {
  getType(): NodeType { return 'file'; }
  asFile() { return this; }
  async read(): Promise<string> {return null;}
  async write(data: string): Promise<void> {}
  async readCanvas(): Promise<HTMLCanvasElement> {return null;}
  async writeCanvas(canvas: HTMLCanvasElement): Promise<void> {}
}

export class Folder extends Node {
  getType(): NodeType { return 'folder'; }
  asFolder() { return this; }
  async setAttribute(key: string, value: string): Promise<void> { throw 'not implemented'; }
  async getAttribute(key: string): Promise<string> { throw 'not implemented'; }
  async list(): Promise<Entry[]> { throw 'not implemented'; }
  async link(name: string, nodeId: NodeId): Promise<BindId> { throw 'not implemented'; }
  async unlink(bindId: BindId): Promise<void> { throw 'not implemented'; }
  async unlinkv(bindIds: BindId[]): Promise<void> {
    for (const bindId of bindIds) {
      await this.unlink(bindId);
    }
  }
  async rename(bindId: BindId, newname: string): Promise<void> { throw 'not implemented'; }
  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> { throw 'not implemented'; }
  async getEntry(bindId: BindId): Promise<Entry> { throw 'not implemented'; }
  async getEntryByName(name: string): Promise<Entry> { throw 'not implemented'; }
  async getEntriesByName(name: string): Promise<Entry[]> { throw 'not implemented'; }

  async embody(e: Entry): Promise<EmbodiedEntry> { return e ? [e[0], e[1], await this.fileSystem.getNode(e[2])] : null; }
  async listEmbodied(): Promise<EmbodiedEntry[]> { return await Promise.all((await this.list()).map(e => this.embody(e))); }
  async getEmbodiedEntry(bindId: BindId): Promise<EmbodiedEntry> { return await this.embody(await this.getEntry(bindId)); }
  async getEmbodiedEntryByName(name: string): Promise<EmbodiedEntry> { return await this.embody(await this.getEntryByName(name)); }
  async getEmbodiedEntriesByName(name: string): Promise<EmbodiedEntry[]> { return await Promise.all((await this.getEntriesByName(name)).map(e => this.embody(e))); }
  async getNode(bindId: BindId): Promise<Node> { return (await this.getEmbodiedEntry(bindId))[2]; }
  async getNodeByName(name: string): Promise<Node> { return (await this.getEmbodiedEntryByName(name))[2]; }
  async getNodesByName(name: string): Promise<Node[]> { return ((await this.getEmbodiedEntriesByName(name))).map(e => e[2]); }
  async getBindId(nodeId: NodeId): Promise<BindId> { throw 'not implemented'; }
}

export async function makeFolders(fs: FileSystem, folders: string[]): Promise<void> {
  const root = await fs.getRoot();
  const children = await root.list();
  for (const f of folders) {
    const found = children.find((c) => c[1] === f);
    if (!found) {
      const folder = await fs.createFolder();
      await root.link(f, folder.id);
    }
  }
}
