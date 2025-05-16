type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;

export class BlobStore {
  dirHandle: FileSystemDirectoryHandle | null = null;

  async open(dirHandle: FileSystemDirectoryHandle) {
    this.dirHandle = await dirHandle.getDirectoryHandle('blobs', { create: true });
  }

  async write(id: string, blob: Blob) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    const fileHandle = await this.dirHandle.getFileHandle(`${id}.bin`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async read(id: string): Promise<Blob> {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    const fileHandle = await this.dirHandle.getFileHandle(`${id}.bin`);
    const file = await fileHandle.getFile();
    return file;
  }

  async delete(id: string) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    await this.dirHandle.removeEntry(`${id}.bin`);
  }

  async gc(validIds: Set<string>) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    for await (const entry of this.dirHandle.values()) {
      if (entry.kind === 'file') {
        const id = entry.name.replace(/\.bin$/, '');
        if (!validIds.has(id)) {
          await this.dirHandle.removeEntry(entry.name);
        }
      }
    }
  }
}