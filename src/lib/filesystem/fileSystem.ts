export class FileSystem {
  async createFile(): Promise<File> {return null;}
  async createFolder(): Promise<Folder> {return null;}

  async getRoot(): Promise<Folder> { return null; }
}

export type NodeType = 'file' | 'folder';

export class Node {
  constructor() {}

  getType() { return null; }
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
  getType() { return 'file'; }
  asFile() { return this; }
  async read(): Promise<string> {return null;}
  async write(data): Promise<void> {}
}

export class Folder extends Node {
  getType() { return 'folder'; }
  asFolder() { return this; }
  async list(): Promise<[string, Node][]> {return [];}
  async link(name, Node): Promise<void> {}
  async unlink(name): Promise<void> {}
  async get(name): Promise<Node> {return null;}
}
