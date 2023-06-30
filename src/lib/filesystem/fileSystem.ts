export class Node {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  getType() { return null; }
  asFile(): File { return null; }
  asFolder() : Folder { return null; }
}

export class File extends Node {
  constructor(name) {
    super(name);
  }

  getType() { return 'file'; }
  asFile() { return this; }
  async read(): Promise<string> {return null;}
  async write(data): Promise<void> {}
}

export class Folder extends Node {
  constructor(name) {
    super(name);
  }

  getType() { return 'folder'; }
  asFolder() { return this; }
  async list(): Promise<Node[]> {return [];}
  async createFile(name): Promise<File> {return null;}
  async createFolder(name): Promise<Folder> {return null;}
  async deleteChild(name): Promise<void> {}
  async getChild(name): Promise<Folder> {return null;}
  async copyChildTo(name, dest): Promise<void> {}
}
