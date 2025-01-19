import { ulid } from 'ulid';
import type { NodeId, BindId, Entry } from './fileSystem';
import { Node, File, Folder, FileSystem } from './fileSystem';
import type { ContentStorage } from './contentStorage/contentStorage';
import { BackblazeContentStorage } from './contentStorage/backblazeImageStorage';
import { supabase } from "../../supabase";

export class SupabaseFileSystem extends FileSystem {
  storage: ContentStorage | null = null;
  isVault: boolean = false;
  userId: string = '';

  constructor() {
    super();
  }

  async openShared(key: string | null) {
/*
    this.database = supabase;
    this.storage = new SupabaseContentStorage();
    const userCredential = await getCurrentUserOrSignInAnonymously();

    if (key) {
      this.boxId = key;
    } else {
      this.boxId = ulid();
      // set author
      await this.database
        .from('cloud_files')
        .insert([{ id: this.boxId, author: userCredential.user.id }]);
    }
*/
  }

  async openCloud() {
    this.storage = new BackblazeContentStorage();
    this.isVault = true;
    const user = await supabase.auth.getUser();
    this.userId = user.data.user!.id;
  }

  async createFile(_type: string): Promise<File> {
    return this.createFileWithId(ulid() as NodeId, _type);
  }

  async createFileWithId(id: NodeId, _type: string): Promise<File> {
    await supabase
      .from('cloud_files')
      .insert([{ id, type: 'file', owner_id: this.userId }]);
    const file = new SupabaseFile(this, id);
    return file;
  }

  async createFolder(): Promise<Folder> {
    const id = ulid();
    await supabase
      .from('cloud_files')
      .insert([{ id, type: 'folder', owner_id: this.userId }]);
    const folder = new SupabaseFolder(this, id as NodeId);
    return folder;
  }

  async destroyNode(id: NodeId): Promise<void> {
    const { data, error } = await supabase
      .from('cloud_files')
      .select('type, link')
      .eq('id', id)
      .single();

    if (data?.type === 'file') {
      const linkId = data.link;
      if (linkId) {
        await this.storage!.erase(linkId);
      }
    }
    await supabase
      .from('cloud_files')
      .delete()
      .eq('id', id);
  }

  async getNode(id: NodeId): Promise<Node | null> {
    const { data, error } = await supabase
      .from('cloud_files')
      .select('type')
      .eq('id', id);

    if (data && 0 < data.length) {
      if (data[0].type === 'file') {
        const file = new SupabaseFile(this, id);
        return file;
      } else if (data[0].type === 'folder') {
        const folder = new SupabaseFolder(this, id);
        return folder;
      }
    }
    return null;
  }

  async getRoot(): Promise<Folder> {
    const rootId = "root" as NodeId;
    const node = await this.getNode(rootId) as Folder;
    if (node) { 
      return node; 
    }
    await supabase
      .from('cloud_files')
      .insert([{ id: rootId, type: 'folder', owner_id: this.userId }]);
    return await this.getNode(rootId) as Folder;
  }
}

export class SupabaseFile extends File {
  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  async read(): Promise<any> {
    const { data, error } = await supabase
      .from('cloud_files')
      .select('content')
      .eq('id', this.id)
      .single();
    return data?.content ?? '';
  }

  async write(data: any): Promise<void> {
    await supabase
      .from('cloud_files')
      .update({ content: data })
      .eq('id', this.id);
  }

  async readBlob(): Promise<Blob> {
    const { data, error } = await supabase
      .from('cloud_files')
      .select('link')
      .eq('id', this.id)
      .single();
    const id = data?.link;
    return await (this.fileSystem as SupabaseFileSystem).storage!.readBlob(id);
  }

  async writeBlob(blob: Blob): Promise<void> {
    const id = await (this.fileSystem as SupabaseFileSystem).storage!.writeBlob(blob);
    await supabase
      .from('cloud_files')
      .update({ link: id })
      .eq('id', this.id);
  }

  async readCanvas(): Promise<HTMLCanvasElement> {
    const { data, error } = await supabase
      .from('cloud_files')
      .select('link')
      .eq('id', this.id)
      .single();
    const id = data?.link;
    return await (this.fileSystem as SupabaseFileSystem).storage!.readCanvas(id);
  }

  async writeCanvas(canvas: HTMLCanvasElement): Promise<void> {
    const id = await (this.fileSystem as SupabaseFileSystem).storage!.writeCanvas(canvas);
    await supabase
      .from('cloud_files')
      .update({ link: id })
      .eq('id', this.id);
  }
}

export class SupabaseFolder extends Folder {
  constructor(fileSystem: FileSystem, id: NodeId) {
    super(fileSystem, id);
  }

  async list(): Promise<Entry[]> {
    const { data, error } = await supabase
      .from('cloud_files')
      .select('content')
      .eq('id', this.id)
      .single();
    return JSON.parse(data?.content ?? '[]');
  }

  async link(name: string, nodeId: NodeId): Promise<BindId> {
    return await this.insert(name, nodeId, -1);
  }

  async unlink(bindId: BindId): Promise<void> {
    const entries = await this.list();
    const newEntries = entries.filter((entry) => entry[0] !== bindId);
    await supabase
      .from('cloud_files')
      .update({ content: JSON.stringify(newEntries) })
      .eq('id', this.id);
    super.notifyDelete(bindId);
  }

  async rename(bindId: BindId, newName: string): Promise<void> {
    const entries = await this.list();
    const entry = entries.find((entry) => entry[0] === bindId)!;
    entry[1] = newName;
    await supabase
      .from('cloud_files')
      .update({ content: JSON.stringify(entries) })
      .eq('id', this.id);
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
    await supabase
      .from('cloud_files')
      .update({ content: JSON.stringify(entries) })
      .eq('id', this.id);
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
