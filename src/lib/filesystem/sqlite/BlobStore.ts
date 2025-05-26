type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;

export interface BlobStore {
  open(dirHandle: FileSystemDirectoryHandle): Promise<void>;
  write(id: string, blob: Blob): Promise<string>; // Changed to return string (path)
  read(id: string): Promise<Blob>;
  delete(id: string): Promise<void>;
  gc(validIds: Set<string>): Promise<void>;
}

export class FSABlobStore implements BlobStore {
  dirHandle: FileSystemDirectoryHandle | null = null;

  async open(dirHandle: FileSystemDirectoryHandle) {
    this.dirHandle = await dirHandle.getDirectoryHandle('blobs', { create: true });
  }

  async write(id: string, blob: Blob): Promise<string> {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    console.log('Writing blob:', id, 'type:', blob.type);
    
    const fileName = `${id}.bin`;
    const metaFileName = `${id}.meta`;
    
    await Promise.all([
      (async () => {
        const fileHandle = await this.dirHandle!.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable({ keepExistingData: false });
        await blob.stream().pipeTo(writable);
      })(),
      (async () => {
        const metaHandle = await this.dirHandle!.getFileHandle(metaFileName, { create: true });
        const metaWritable = await metaHandle.createWritable({ keepExistingData: false });
        await metaWritable.write(JSON.stringify({ type: blob.type }));
        await metaWritable.close();
      })()
    ]);
    
    return `blobs/${fileName}`;
  }

  async read(id: string): Promise<Blob> {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    
    // バイナリデータを読み込み
    const fileHandle = await this.dirHandle.getFileHandle(`${id}.bin`);
    const file = await fileHandle.getFile();
    
    // MIME type情報を読み込み
    let mimeType = 'application/octet-stream';
    const metaHandle = await this.dirHandle.getFileHandle(`${id}.meta`);
    const metaFile = await metaHandle.getFile();
    const metaText = await metaFile.text();
    const meta = JSON.parse(metaText);
    mimeType = meta.type || 'application/octet-stream';
    
    // 正しいMIME typeでBlobを再構築
    const arrayBuffer = await file.arrayBuffer();
    return new Blob([arrayBuffer], { type: mimeType });
  }

  async delete(id: string) {
    if (!this.dirHandle) throw new Error('BlobStore not initialized');
    await this.dirHandle.removeEntry(`${id}.bin`);
    await this.dirHandle.removeEntry(`${id}.meta`);
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

// メモリ上のBlobStore実装
export class MemoryBlobStore implements BlobStore {
  private blobs: Map<string, Blob> = new Map();

  async open(_dirHandle: FileSystemDirectoryHandle): Promise<void> {
    // メモリストアなので何もしない
  }

  async write(id: string, blob: Blob): Promise<string> {
    this.blobs.set(id, blob);
    return `blobs/${id}.bin`; // Return a mock path
  }

  async read(id: string): Promise<Blob> {
    const blob = this.blobs.get(id);
    if (!blob) throw new Error('Blob not found: ' + id);
    return blob;
  }

  async delete(id: string): Promise<void> {
    this.blobs.delete(id);
  }

  async gc(validIds: Set<string>): Promise<void> {
    for (const id of Array.from(this.blobs.keys())) {
      if (!validIds.has(id)) {
        this.blobs.delete(id);
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


