type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;

export class BlobStore {
  dirHandle: FileSystemDirectoryHandle | null = null;

  async open(dirHandle: FileSystemDirectoryHandle) {
    this.dirHandle = await dirHandle.getDirectoryHandle('blobs', { create: true });
  }

  async write(id: string, blob: Blob) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    console.log('Writing blob:', id);
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

// --- ユーティリティ: オブジェクト内のBlobを外部ファイル化し、blobPath参照に置換 ---
export async function externalizeBlobsInObject(
  obj: any,
  blobStore: BlobStore,
  baseId: string,
  path: string[] = []
): Promise<any> {
  if (obj instanceof Blob) {
    const blobId = `${baseId}_${path.join('_')}`;
    await blobStore.write(blobId, obj);
    return { __blobPath: `blobs/${blobId}.bin` };
  } else if (Array.isArray(obj)) {
    return Promise.all(obj.map((v, i) => externalizeBlobsInObject(v, blobStore, baseId, [...path, String(i)])));
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = await externalizeBlobsInObject(v, blobStore, baseId, [...path, k]);
    }
    return result;
  } else {
    return obj;
  }
}

// --- ユーティリティ: blobPath参照をBlobに戻す ---
export async function internalizeBlobsInObject(
  obj: any,
  blobStore: BlobStore
): Promise<any> {
  if (obj && typeof obj === 'object') {
    if (obj.__blobPath && typeof obj.__blobPath === 'string') {
      const m = obj.__blobPath.match(/^blobs\/(.+)\.bin$/);
      if (m) {
        return await blobStore.read(m[1]);
      }
    }
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((v) => internalizeBlobsInObject(v, blobStore)));
    } else {
      const result: any = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = await internalizeBlobsInObject(v, blobStore);
      }
      return result;
    }
  } else {
    return obj;
  }
}


