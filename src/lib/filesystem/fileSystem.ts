export type NodeType = 'file' | 'folder';
export type NodeId = string & { _NodeId: never };
export type BindId = string & { _BindId: never };

export type Entry = [BindId, string, NodeId];
export type EmbodiedEntry = [BindId, string, Node];

export class FileSystem {
  async createFile(): Promise<File> {return null;}
  async createFolder(): Promise<Folder> {return null;}

  async getNode(id: NodeId): Promise<Node> {return null;}

  async getRoot(): Promise<Folder> { return null; }
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
}

export class Folder extends Node {
  getType(): NodeType { return 'folder'; }
  asFolder() { return this; }
  async list(): Promise<Entry[]> {return [];}
  async link(name: string, nodeId: NodeId): Promise<BindId> { return null;}
  async unlink(bindId: BindId): Promise<void> {}
  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> { return null; }
  async getEntry(bindId: BindId): Promise<Entry> { return null; }
  async getEntryByName(name: string): Promise<Entry> { return null; }
  async getEntriesByName(name: string): Promise<Entry[]> { return []; }

  async embody(e: Entry): Promise<EmbodiedEntry> { return [e[0], e[1], await this.fileSystem.getNode(e[2])]; }
  async listEmbodied(): Promise<EmbodiedEntry[]> { return await Promise.all((await this.list()).map(e => this.embody(e))); }
  async getEmbodiedEntry(bindId: BindId): Promise<EmbodiedEntry> { return await this.embody(await this.getEntry(bindId)); }
  async getEmbodiedEntryByName(name: string): Promise<EmbodiedEntry> { return await this.embody(await this.getEntryByName(name)); }
  async getEmbodiedEntriesByName(name: string): Promise<EmbodiedEntry[]> { return await Promise.all((await this.getEntriesByName(name)).map(e => this.embody(e))); }
  async getNode(bindId: BindId): Promise<Node> { return await this.getEmbodiedEntry(bindId)[2]; }
  async getNodeByName(name: string): Promise<Node> { return await this.getEmbodiedEntryByName(name)[2]; }
  async getNodesByName(name: string): Promise<Node[]> { return (await this.getEmbodiedEntriesByName(name)).map(e => e[2]); }
}
