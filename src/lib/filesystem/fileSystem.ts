import { ulid } from 'ulid';

export type NodeType = 'file' | 'folder';
export type NodeId = string & { _NodeId: never };
export type BindId = string & { _BindId: never };
export type FileSystemId = string & { _FileSystemId: never };

export type Entry = [BindId, string, NodeId];
export type EmbodiedEntry = [BindId, string, Node];

export interface Watcher {
  onInsert: (bindId: BindId, index: number, sourceParent: Folder | null) => void;
  onDelete: (bindId: BindId) => void;
  onRename: (bindId: BindId, newName: string) => void;
}

export interface FileSystem {
  id: FileSystemId;
  watchers: { [key: NodeId]: Watcher[] };
  createFile(type?: string): Promise<File>;
  createFileWithId(id: NodeId, type?: string): Promise<File>;
  createFolder(): Promise<Folder>;
  destroyNode(id: NodeId): Promise<void>;
  getNode(id: NodeId): Promise<Node | null>;
  getRoot(): Promise<Folder>;
  collectTotalSize(): Promise<number>;
}

export abstract class FileSystem {
  id: FileSystemId;
  watchers: { [key: NodeId]: Watcher[] } = {};
  isVault: boolean = false; // envelopeを直接保管するタイプのファイルシステムかどうか

  constructor() {
    this.id = ulid() as FileSystemId;
  }

  watch(nodeId: NodeId, watcher: Watcher) {
    this.watchers[nodeId] ??= [];
    this.watchers[nodeId].push(watcher);
  }
  unwatch(nodeId: NodeId, watcher: Watcher) { 
    this.watchers[nodeId] = this.watchers[nodeId]?.filter(w => w !== watcher) ?? [];
  }
  getWatchers(nodeId: NodeId): Watcher[] {
    return this.watchers[nodeId] ?? [];
  }
}

export interface Node {
  getType(): NodeType;
  asFile(): File | null;
  asFolder(): Folder | null;
}

export abstract class Node implements Node {
  fileSystem: FileSystem;
  id: NodeId

  constructor(fileSystem: FileSystem, id: NodeId) { 
    this.fileSystem = fileSystem;
    this.id = id; 
  }

  async getNodeByPath(path: string, fullpath: string | null = null): Promise<Node> {
    if (path === '') {
      return this;
    }
    if (!fullpath) {
      fullpath = path;
    }
    const [name, ...rest] = path.split('/');
    const folder = await this.asFolder()!.getNodeByName(name);
    if (!folder) {
      throw new Error(`Node not found: ${fullpath}`);
    }
    return folder.getNodeByPath(rest.join('/'), fullpath);
  }
}

export interface File {
  read(): Promise<string>;
  write(data: any): Promise<void>;
  readCanvas(waitsComplete: boolean): Promise<HTMLCanvasElement>;
  writeCanvas(canvas: HTMLCanvasElement): Promise<void>;
  readVideo(waitsComplete: boolean): Promise<HTMLVideoElement>;
  writeVideo(video: HTMLVideoElement): Promise<void>;
  readBlob(): Promise<Blob>;
  writeBlob(blob: Blob): Promise<void>;
}

export abstract class File extends Node implements File {
  getType(): NodeType { return 'file'; }
  asFile() { return this; }
  asFolder() { return null; }
}

export interface Folder {
  setAttribute(key: string, value: string): Promise<void>;
  getAttribute(key: string): Promise<string>;
  list(): Promise<Entry[]>;
  link(name: string, nodeId: NodeId): Promise<BindId>;
  unlink(bindId: BindId): Promise<void>;
  unlinkv(bindIds: BindId[]): Promise<void>;
  rename(bindId: BindId, newname: string): Promise<void>;
  insert(name: string, nodeId: NodeId, index: number): Promise<BindId>;
  getEntry(bindId: BindId): Promise<Entry | null>;
  getEntryByName(name: string): Promise<Entry | null>;
  getEntriesByName(name: string): Promise<Entry[]>;
  getBindId(nodeId: NodeId): Promise<BindId | null>;
}

export abstract class Folder extends Node {
  getType(): NodeType { return 'folder'; }
  asFile() { return null; }
  asFolder() { return this; }

  async unlinkv(bindIds: BindId[]): Promise<void> {
    for (const bindId of bindIds) {
      await this.unlink(bindId);
      this.notifyDelete(bindId);
    }
  }

  nth<T>(a: T[] | null, n: number): T | null {
    return a ? a[n] : null;
  }

  async embody(e: Entry | null): Promise<EmbodiedEntry | null> { 
    if (!e) return null;
    const a = await this.fileSystem.getNode(e[2]);
    return a ? [e[0], e[1], a] : null;
  }
  async listEmbodied(): Promise<EmbodiedEntry[]> { return (await Promise.all((await this.list()).map(e => this.embody(e)))).filter(e => e !== null) as EmbodiedEntry[]; };
  async getEmbodiedEntry(bindId: BindId): Promise<EmbodiedEntry | null> { return await this.embody(await this.getEntry(bindId)); }
  async getEmbodiedEntryByName(name: string): Promise<EmbodiedEntry | null> { return await this.embody(await this.getEntryByName(name)); }
  async getEmbodiedEntriesByName(name: string): Promise<EmbodiedEntry[]> { return (await Promise.all((await this.getEntriesByName(name)).map(e => this.embody(e)))).filter(e => e !== null) as EmbodiedEntry[]; }
  async getNode(bindId: BindId): Promise<Node | null> { 
    const a = await this.embody(await this.getEntry(bindId)); 
    return a ? a[2] : null;
  }
  async getNodeByName(name: string): Promise<Node | null> {
    const a = await this.embody(await this.getEntryByName(name));
    return a ? a[2] : null;
  }
  async getNodesByName(name: string): Promise<Node[]> {
    return (await Promise.all((await this.getEntriesByName(name)).map(e => this.fileSystem.getNode(e[2])))).filter(e => e !== null) as Node[];
  }

  watch(watcher: Watcher) {
    this.fileSystem.watch(this.id, watcher);
  }
  unwatch(watcher: Watcher) { 
    this.fileSystem.unwatch(this.id, watcher);
  }
  notifyInsert(bindId: BindId, index: number, sourceParent: Folder | null) {
    for (const watcher of this.fileSystem.getWatchers(this.id)) {
      watcher.onInsert(bindId, index, sourceParent);
    }
  }
  notifyDelete(bindId: BindId) {
    for (const watcher of this.fileSystem.getWatchers(this.id)) {
      watcher.onDelete(bindId);
    }
  }
  notifyRename(bindId: BindId, newName: string) {
    for (const watcher of this.fileSystem.getWatchers(this.id)) {
      watcher.onRename(bindId, newName);
    }
  }
}

export async function makeFolders(fs: FileSystem, folders: string[]): Promise<void> {
  const root = await fs.getRoot();
  const children = await root.list();
  for (const f of folders) {
    const found = children.find((c) => c[1] === f);
    if (!found) {
      console.log("not found", f);
      const folder = await fs.createFolder();
      await root.link(f, folder.id);
    }
  }
}
