import { Node, Folder, File } from './fileSystem';

export class MockFile extends File {
  content: string;

  constructor(name) {
    super(name);
  }

  async read(): Promise<string> {
    return this.content
  }

  async write(data) {
    this.content = data;
  }
}

export class MockFolder extends Folder {
  files: Node[] = [];

  constructor(name) {
    super(name);
  }

  async list() {
    return this.files;
  }

  async createFile(name) {
    const file = new MockFile(name);
    this.files.push(file);
    return file;
  }

  async createFolder(name) {
    const folder = new MockFolder(name);
    this.files.push(folder);
    return folder;
  }

  async deleteChild(name) {
    this.files = this.files.filter(file => file.name !== name);
  }

  async getChild(name): Promise<Folder> {
    return this.files.find(file => file.name === name).asFolder();
  }

  async copyChildTo(name: any, dest: Node): Promise<void> {
    const node = this.files.find(file => file.name === name);
    if (node.getType() === 'file') {
      const srcFile = node.asFile();
      const destFolder = dest.asFolder();
      const newFile = await destFolder.createFile(srcFile.name);
      newFile.write(await srcFile.read());
    } else {
      const srcFolder = node.asFolder();
      const destFolder = await dest.asFolder().createFolder(name);
      for (const node of await srcFolder.list()) {
        await srcFolder.copyChildTo(node.name, destFolder);
      }
    }
  }
}