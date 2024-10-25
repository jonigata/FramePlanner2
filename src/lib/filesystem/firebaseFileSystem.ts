import { ulid } from 'ulid';
import type { NodeId, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import type { Database, DatabaseReference } from "firebase/database";
import { getDatabase, ref, push, set, get, child, remove } from "firebase/database";
import { getCurrentUserOrSignInAnonymously, getShareStorage, getCloudStorage } from '../../firebase';
import type { ContentStorage } from './contentStorage/contentStorage';
import { FirebaseContentStorage } from './contentStorage/firebaseImageStorage';
import { BackblazeContentStorage } from './contentStorage/backblazeImageStorage';

export class FirebaseFileSystem extends FileSystem {
  database: Database | null = null;
  boxRef: DatabaseReference | null = null;
  nodesRef: DatabaseReference | null = null;
  storage: ContentStorage | null = null;
  boxId: string | null = null;

  constructor() {
    super();
  }

  async openShared(key: string | null) {
    this.database = getDatabase();
    this.storage = new FirebaseContentStorage(getShareStorage());
    const userCredential = await getCurrentUserOrSignInAnonymously();

    if (key) {
      this.boxRef = ref(this.database, `shares/${key}`);
    } else {
      this.boxRef = ref(this.database, `shares/${ulid()}`);
      // set author
      await set(child(this.boxRef, 'author'), userCredential.user.uid);
    }

    this.nodesRef = child(this.boxRef, 'fileSystem/nodes');
    this.boxId = this.boxRef.key;
  }

  async openCloud() {
    this.database = getDatabase();
    this.storage = new BackblazeContentStorage();
    this.isVault = true;
    const userCredential = await getCurrentUserOrSignInAnonymously();

    this.boxRef = ref(this.database, `cloud/${userCredential.user.uid}`);
    this.nodesRef = child(this.boxRef, 'fileSystem/nodes');
    this.boxId = this.boxRef.key;
  }

  async createFile(_type: string): Promise<File> {
    return this.createFileWithId(push(this.nodesRef!).key as NodeId, _type);
  }

  async createFileWithId(id: NodeId, _type: string): Promise<File> {
    const fileRef = child(this.nodesRef!, id);
    await set(child(fileRef, 'type'), 'file');
    const file = new FirebaseFile(this, id);
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = push(this.nodesRef!).key as NodeId;
    const folderRef = child(this.nodesRef!, id);
    await set(child(folderRef, 'type'), 'folder');
    const file = new FirebaseFolder(this, id);
    return file;
  }

  async destroyNode(id: NodeId): Promise<void> {
    await remove(child(this.nodesRef!, id));
  }

  async getNode(id: NodeId): Promise<Node | null> {
    const snapshot = await get(child(this.nodesRef!, id));
    if (snapshot.exists()) {
      if (snapshot.val().type === 'file') {
        const file = new FirebaseFile(this, id);
        return file;
      } else if (snapshot.val().type === 'folder') {
        const folder = new FirebaseFolder(this, id);
        return folder;
      }
    }
    return null;
  }

  async getRoot(): Promise<Folder> {
    const rootId = "root" as NodeId;
    const node = await this.getNode(rootId) as Folder;
    if (node) { return node; }
    await set(child(this.nodesRef!, rootId), { type: 'folder' });
    return await this.getNode(rootId) as Folder;
  }
}

export class FirebaseFile extends File {
  get nodeRef(): DatabaseReference {
    return child((this.fileSystem as FirebaseFileSystem).nodesRef!, this.id);
  }

  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  async read(): Promise<any> {
    const snapshot = await get(child(this.nodeRef, 'content'));
    return snapshot.val() ?? '';
  }

  async write(data: any): Promise<void> {
    await set(child(this.nodeRef, 'content'), data);
  }

  async readBlob(): Promise<Blob> {
    const snapshot = await get(child(this.nodeRef, 'link'));
    const id = snapshot.val();
    return await (this.fileSystem as FirebaseFileSystem).storage!.readBlob(id);
  }

  async writeBlob(blob: Blob): Promise<void> {
    const id = await (this.fileSystem as FirebaseFileSystem).storage!.writeBlob(blob);
    await set(child(this.nodeRef, 'link'), id);
  }

  async readCanvas(): Promise<HTMLCanvasElement> {
    const snapshot = await get(child(this.nodeRef, 'link'));
    const id = snapshot.val();
    return await (this.fileSystem as FirebaseFileSystem).storage!.readCanvas(id);
  }

  async writeCanvas(canvas: HTMLCanvasElement): Promise<void> {
    const id = await (this.fileSystem as FirebaseFileSystem).storage!.writeCanvas(canvas);
    await set(child(this.nodeRef, 'link'), id);
  }
}

export class FirebaseFolder extends Folder {
  get nodeRef(): DatabaseReference {
    return child((this.fileSystem as FirebaseFileSystem).nodesRef!, this.id);
  }

  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  async list(): Promise<Entry[]> {
    const snapshot = await get(child(this.nodeRef, 'content'));
    const s = JSON.parse(snapshot.val() as string ?? '[]');
    return s;
  }

  async link(name: string, nodeId: NodeId): Promise<BindId> {
    return await this.insert(name, nodeId, -1);
  }

  async unlink(bindId: BindId): Promise<void> {
    const entries = await this.list();
    const newEntries = entries.filter((entry) => entry[0] !== bindId);
    await set(child(this.nodeRef, 'content'), JSON.stringify(newEntries));
    super.notifyDelete(bindId);
  }

  async rename(bindId: BindId, newName: string): Promise<void> {
    const entries = await this.list();
    const entry = entries.find((entry) => entry[0] === bindId)!;
    entry[1] = newName;
    await set(child(this.nodeRef, 'content'), JSON.stringify(entries));
    super.notifyRename(bindId, newName);
  }

  async insert(name: string, nodeId: NodeId, index: number): Promise<BindId> {
    const bindId = ulid() as BindId;
    const entry: Entry = [bindId, name, nodeId];
    const entries = await this.list();
    if (index < 0) {
      index = entries.length;
    }
    entries.splice(index, 0, entry);
    await set(child(this.nodeRef, 'content'), JSON.stringify(entries));
    super.notifyInsert(bindId, index, null);
    return bindId;
  }

  async getEntry(bindId: BindId): Promise<Entry | null> {
    const entries = await this.list();
    return entries.find((entry) => entry[0] === bindId) ?? null;
  }

  async getEntryByName(name: string): Promise<Entry | null> {
    const entries = await this.list();
    return entries.find((entry) => entry[1] === name) ?? null;
  }

  async getEntriesByName(name: string): Promise<Entry[]> {
    const entries = await this.list();
    return entries.filter((entry) => entry[1] === name);
  }
}

async function sha1(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}