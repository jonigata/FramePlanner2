export type NodeType = 'file' | 'folder';
export type NodeId = string & { _NodeId: never };
export type BindId = string & { _BindId: never };

export class FileSystem {
  async createFile(): Promise<File> {return null;}
  async createFolder(): Promise<Folder> {return null;}

  async getNode(id: NodeId): Promise<Node> {return null;}

  async getRoot(): Promise<Folder> { return null; }
}

export class Node {
  id: NodeId

  constructor(id) { this.id = id; }
  getType(): NodeType { return null; }
  asFile(): File { return null; }
  asFolder() : Folder { return null; }

  async getNodeByPath(path: string): Promise<Node> {
    if (path === '') {
      return this;
    }
    const [name, ...rest] = path.split('/');
    const folder = await this.asFolder().get(name);
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
  async list(): Promise<[BindId, string, Node][]> {return [];}
  async link(name: string, node: Node): Promise<BindId> { return null;}
  async unlink(bindId: BindId): Promise<void> {}
  async insert(name: string, node: Node, index: number): Promise<BindId> { return null; }
  async getEntry(bindId: BindId): Promise<[BindId, string, Node]> { return null; }
  async getEntryByName(name: string): Promise<[BindId, string, Node]> { return null; }
  async getEntriesByName(name: string): Promise<[BindId, string, Node][]> { return []; }

  async getNode(bindId: BindId): Promise<Node> { return (await this.getEntry(bindId))[2]; }
  async getNodeByName(name: string): Promise<Node> { return (await this.getEntryByName(name))[2]; }
  async getNodesByName(name: string): Promise<Node[]> { return (await this.getEntriesByName(name)).map(e => e[2]); }
}
