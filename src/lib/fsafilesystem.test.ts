import { describe, it, expect } from 'vitest';
import type { Canvas } from 'canvas';
import { createCanvas } from 'canvas';
import type { MediaResource } from './filesystem/fileSystem.js';

import { beforeEach, afterEach, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import type * as sqlJs from 'sql.js';
import path from 'path';

// FSAFileSystem 関連の import
import { FSAFileSystem, FSAFilePersistenceProvider, FSAFile, FSAFolder } from './filesystem/fsaFileSystem.js';
import { SqlJsAdapter } from './filesystem/sqlite/SqlJsAdapter.js';
import { type BlobStore } from './filesystem/sqlite/BlobStore.js';
import type { NodeId } from './filesystem/fileSystem.js';
import { NodeCanvasMediaConverter } from '../../test/helpers.js';

class MockFileHandle implements globalThis.FileSystemFileHandle {
  kind: 'file' = 'file';
  content: Uint8Array = new Uint8Array();
  constructor(public name: string) {}

  async getFile(): Promise<globalThis.File> {
    const self = this;
    return {
      arrayBuffer: async () => self.content.buffer.slice(self.content.byteOffset, self.content.byteOffset + self.content.byteLength),
      text: async () => new TextDecoder().decode(self.content),
      size: self.content.byteLength,
      type: 'application/octet-stream',
      slice: (start?: number, end?: number, contentType?: string) => new Blob([self.content.slice(start, end)], { type: contentType }),
      stream: () => new ReadableStream({
        start(controller) {
          controller.enqueue(self.content);
          controller.close();
        }
      }),
      lastModified: Date.now(),
    } as unknown as globalThis.File;
  }

  async createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream> {
    let currentBuffer = options?.keepExistingData ? Array.from(this.content) : [];
    const self = this;
    return {
      async write(data: BufferSource | Blob | string | WriteParams) {
        let dataArray: Uint8Array;
        if (typeof data === 'string') {
          dataArray = new TextEncoder().encode(data);
        } else if (data instanceof Blob) {
          dataArray = new Uint8Array(await data.arrayBuffer());
        } else if (data instanceof ArrayBuffer) {
          dataArray = new Uint8Array(data);
        } else if ('buffer' in data && data.buffer instanceof ArrayBuffer) { 
          dataArray = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else if (typeof data === 'object' && data !== null && 'data' in data && (data as WriteParams).data != null) {
            const writeParamsData = (data as WriteParams).data;
            if (typeof writeParamsData === 'string') {
                dataArray = new TextEncoder().encode(writeParamsData);
            } else if (writeParamsData instanceof Blob) {
                dataArray = new Uint8Array(await writeParamsData.arrayBuffer());
            } else if (writeParamsData instanceof ArrayBuffer) {
                dataArray = new Uint8Array(writeParamsData);
            } else if (writeParamsData && 'buffer' in writeParamsData) {
                dataArray = new Uint8Array(writeParamsData.buffer, writeParamsData.byteOffset, writeParamsData.byteLength);
            } else {
                 throw new Error("Unsupported data type for write in WriteParams");
            }
        } else {
            throw new Error("Unsupported data type for write");
        }
        
        const newContent = new Uint8Array(currentBuffer.length + dataArray.length);
        newContent.set(currentBuffer);
        newContent.set(dataArray, currentBuffer.length);
        currentBuffer = Array.from(newContent);
      },
      async close() {
        self.content = Uint8Array.from(currentBuffer);
      },
      async seek(position: number) { /* Not implemented for mock */ },
      async truncate(size: number) { currentBuffer = Array.from(Uint8Array.from(currentBuffer).slice(0, size)); }
    } as FileSystemWritableFileStream;
  }
  async isSameEntry(other: FileSystemHandle): Promise<boolean> { return this === other; }
  queryPermission = async (descriptor?: any) => 'granted' as PermissionState;
  requestPermission = async (descriptor?: any) => 'granted' as PermissionState;
}

// Mock FileSystemDirectoryHandle
class MockDirectoryHandle implements globalThis.FileSystemDirectoryHandle {
  kind: 'directory' = 'directory';
  private _entries: Map<string, MockFileHandle | MockDirectoryHandle> = new Map(); // Renamed to avoid conflict
  constructor(public name: string) {}

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
    if (this._entries.has(name)) {
      const entry = this._entries.get(name);
      if (entry instanceof MockFileHandle) return entry;
      throw new DOMException('TypeMismatchError', 'NotFoundError');
    }
    if (options?.create) {
      const newFile = new MockFileHandle(name);
      this._entries.set(name, newFile);
      return newFile;
    }
    throw new DOMException('File not found', 'NotFoundError');
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
    if (this._entries.has(name)) {
      const entry = this._entries.get(name);
      if (entry instanceof MockDirectoryHandle) return entry as FileSystemDirectoryHandle; // Cast to satisfy return type
      throw new DOMException('TypeMismatchError', 'NotFoundError');
    }
    if (options?.create) {
      const newDir = new MockDirectoryHandle(name);
      this._entries.set(name, newDir);
      return newDir as FileSystemDirectoryHandle; // Cast to satisfy return type
    }
    throw new DOMException('Directory not found', 'NotFoundError');
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    const entry = this._entries.get(name);
    if (!entry) throw new DOMException('Entry not found', 'NotFoundError');
    if (entry instanceof MockDirectoryHandle && entry._entries.size > 0 && !options?.recursive) {
      throw new DOMException('Directory not empty', 'InvalidModificationError');
    }
    this._entries.delete(name);
  }

  entries(): globalThis.FileSystemDirectoryHandleAsyncIterator<[string, globalThis.FileSystemHandle]> {
    const self = this;
    async function* generator(): AsyncGenerator<[string, globalThis.FileSystemHandle], void, unknown> {
      for (const [key, value] of self._entries) {
        yield [key, value as globalThis.FileSystemHandle];
      }
    }
    const iterator = generator();
    return {
      next: () => iterator.next(),
      [Symbol.asyncIterator]: () => iterator,
      [Symbol.asyncDispose]: async () => { /* no-op for mock */ },
    } as globalThis.FileSystemDirectoryHandleAsyncIterator<[string, globalThis.FileSystemHandle]>;
  }

  keys(): globalThis.FileSystemDirectoryHandleAsyncIterator<string> {
    const self = this;
    async function* generator(): AsyncGenerator<string, void, unknown> {
      for (const key of self._entries.keys()) {
        yield key;
      }
    }
    const iterator = generator();
    return {
      next: () => iterator.next(),
      [Symbol.asyncIterator]: () => iterator,
      [Symbol.asyncDispose]: async () => { /* no-op for mock */ },
    } as globalThis.FileSystemDirectoryHandleAsyncIterator<string>;
  }

  values(): globalThis.FileSystemDirectoryHandleAsyncIterator<globalThis.FileSystemHandle> {
    const self = this;
    async function* generator(): AsyncGenerator<globalThis.FileSystemHandle, void, unknown> {
      for (const value of self._entries.values()) {
        yield value as globalThis.FileSystemHandle;
      }
    }
    const iterator = generator();
    return {
      next: () => iterator.next(),
      [Symbol.asyncIterator]: () => iterator,
      [Symbol.asyncDispose]: async () => { /* no-op for mock */ },
    } as globalThis.FileSystemDirectoryHandleAsyncIterator<globalThis.FileSystemHandle>;
  }

  [Symbol.asyncIterator](): globalThis.FileSystemDirectoryHandleAsyncIterator<[string, globalThis.FileSystemHandle]> {
    const self = this;
    async function* generator(): AsyncGenerator<[string, globalThis.FileSystemHandle], void, unknown> {
      for (const [key, value] of self._entries) {
        yield [key, value as globalThis.FileSystemHandle];
      }
    }
    const iterator = generator();
    return {
      next: () => iterator.next(),
      [Symbol.asyncIterator]: () => iterator,
      [Symbol.asyncDispose]: async () => { /* no-op for mock */ },
    } as globalThis.FileSystemDirectoryHandleAsyncIterator<[string, globalThis.FileSystemHandle]>;
  }
  async resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null> { return null; }
  async isSameEntry(other: FileSystemHandle): Promise<boolean> { return this === other; }
  queryPermission = async (descriptor?: any) => 'granted' as PermissionState;
  requestPermission = async (descriptor?: any) => 'granted' as PermissionState;
}

// Mock BlobStore
class MockBlobStore implements BlobStore {
  private blobs: Map<NodeId | string, Blob> = new Map();
  constructor(private dirHandle?: MockDirectoryHandle) {}

  async open(dirHandle?: FileSystemDirectoryHandle): Promise<void> { /* no-op for mock */ }
  async read(idOrPath: NodeId | string): Promise<Blob> {
    const blob = this.blobs.get(idOrPath);
    if (!blob) throw new Error(`Blob ${idOrPath} not found in MockBlobStore`);
    return blob;
  }
  async write(id: string, blob: Blob): Promise<string> { // Return string path
    const blobPath = `blobs/${id}.bin`;
    this.blobs.set(id as NodeId, blob); // Cast to NodeId for internal map key if necessary
    this.blobs.set(blobPath, blob);
    return blobPath; // Return the mock path
  }
  async delete(idOrPath: NodeId | string): Promise<void> {
    this.blobs.delete(idOrPath);
    if (typeof idOrPath === 'string' && idOrPath.startsWith('blobs/')) {
        // no-op
    } else {
        this.blobs.delete(`blobs/${idOrPath}.bin`);
    }
  }
  async list(): Promise<(NodeId | string)[]> {
    return Array.from(this.blobs.keys());
  }
  async gc(): Promise<void> { /* no-op for mock */ } // Added gc method
}

let SQL: sqlJs.SqlJsStatic;
let wasmPath: string;

beforeAll(async () => {
  wasmPath = path.resolve(`node_modules/sql.js/dist/sql-wasm.wasm`);
  SQL = await initSqlJs({ // SQLは依然としてどこかで使われるかもしれないので残す
    locateFile: () => wasmPath
  });
});

describe('FSAFileSystem tests', () => {
  let mockRootHandle: MockDirectoryHandle;
  let persistenceProvider: FSAFilePersistenceProvider;
  let sqliteAdapter: SqlJsAdapter;
  let blobStore: MockBlobStore;
  let mediaConverter: NodeCanvasMediaConverter; // Existing class
  let fs: FSAFileSystem;
  const dbFileName = 'test-fsa.sqlite';

  beforeEach(async () => {
    mockRootHandle = new MockDirectoryHandle('test-fsa-root');
    persistenceProvider = new FSAFilePersistenceProvider(mockRootHandle as unknown as FileSystemDirectoryHandle);
    
    // SqlJsAdapter のコンストラクタ引数の順番を修正し、wasmPath を渡す
    sqliteAdapter = new SqlJsAdapter(persistenceProvider, wasmPath);
    blobStore = new MockBlobStore(mockRootHandle);
    mediaConverter = new NodeCanvasMediaConverter(); // Use existing class

    fs = new FSAFileSystem(sqliteAdapter, blobStore as unknown as BlobStore, mediaConverter); // Cast blobStore
    await fs.open(); // ここで SqlJsAdapter.open() が呼ばれ、内部で initSqlJs が wasmPath を使って実行される
  });

  afterEach(async () => {
    try {
      await mockRootHandle.removeEntry(dbFileName);
    } catch (e) { /* no-op if not found */ }
  });

  it('should create a root folder on open', async () => {
    const root = await fs.getRoot();
    expect(root).toBeInstanceOf(FSAFolder);
    expect(root.id).toBe('/');
  });

  it('should create and get a file', async () => {
    const file = await fs.createFile('text');
    expect(file).toBeInstanceOf(FSAFile);
    const retrievedFile = await fs.getNode(file.id);
    expect(retrievedFile).toBeInstanceOf(FSAFile);
    expect(retrievedFile!.id).toBe(file.id);
  });

  it('should write and read file content', async () => {
    const file = await fs.createFile('text') as FSAFile;
    const testContent = 'Hello, FSA!';
    await file.write(testContent);
    const content = await file.read();
    expect(content).toBe(testContent);
  });
  
  it('should handle JSON object in write and read', async () => {
    const file = await fs.createFile('json') as FSAFile;
    const testObject = { message: 'Hello JSON', value: 123 };
    await file.write(testObject);
    const content = await file.read();
    expect(content).toEqual(testObject);
  });

  it('should create and get a folder', async () => {
    const folder = await fs.createFolder();
    expect(folder).toBeInstanceOf(FSAFolder);
    const retrievedFolder = await fs.getNode(folder.id);
    expect(retrievedFolder).toBeInstanceOf(FSAFolder);
    expect(retrievedFolder!.id).toBe(folder.id);
  });

  it('should link and list children in a folder', async () => {
    const folder = await fs.createFolder() as FSAFolder;
    const file1 = await fs.createFile('text');
    const file2 = await fs.createFile('text');

    await folder.link('file1.txt', file1.id);
    await folder.link('file2.txt', file2.id);

    const entries = await folder.list();
    expect(entries.length).toBe(2);
    expect(entries.map(e => e[1])).toContain('file1.txt');
    expect(entries.map(e => e[1])).toContain('file2.txt');
  });

  it('should destroy a node', async () => {
    const file = await fs.createFile('text');
    const fileId = file.id;
    await fs.destroyNode(fileId);
    const retrievedFile = await fs.getNode(fileId);
    expect(retrievedFile).toBeNull();
  });

  it('should write and read media resource (canvas)', async () => {
    const file = await fs.createFile('image') as FSAFile;
    
    const canvas = createCanvas(10, 10);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 10, 10);

    await file.writeMediaResource(canvas as unknown as MediaResource);
    
    const readResource = await file.readMediaResource() as unknown as Canvas;
    
    expect(readResource.width).toBe(10);
    expect(readResource.height).toBe(10);
    const color = getCenterPixelRGBA(readResource); // Use existing function
    expect(color).toEqual([255, 0, 0, 255]);
  });

  it('should dump and undump filesystem content', async () => {
    const root = await fs.getRoot() as FSAFolder;
    const folder1 = await fs.createFolder() as FSAFolder;
    await root.link('MyFolder', folder1.id);
    const file1 = await fs.createFile('text') as FSAFile;
    await file1.write('Content of file1');
    await folder1.link('MyFile.txt', file1.id);
    const imageFile = await fs.createFile('image') as FSAFile;
    const canvas = createCanvas(5,5); canvas.getContext('2d').fillStyle='blue'; canvas.getContext('2d').fillRect(0,0,5,5);
    await imageFile.writeMediaResource(canvas as unknown as MediaResource);
    await folder1.link('MyImage.png', imageFile.id);


    const dumpStream = await fs.dump();
    let dumpedJsonLines = '';
    const streamReader = dumpStream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await streamReader.read();
      if (done) break;
      dumpedJsonLines += decoder.decode(value, {stream: true});
    }
    dumpedJsonLines += decoder.decode();
    streamReader.releaseLock();

    const mockRootHandle2 = new MockDirectoryHandle('test-fsa-root2');
    const persistenceProvider2 = new FSAFilePersistenceProvider(mockRootHandle2 as unknown as FileSystemDirectoryHandle);
    // const dbFileName2 = 'test-fsa2.sqlite'; // dbFileName is not used in SqlJsAdapter constructor anymore
    const sqliteAdapter2 = new SqlJsAdapter(persistenceProvider2, wasmPath);
    const blobStore2 = new MockBlobStore(mockRootHandle2);
    const fs2 = new FSAFileSystem(sqliteAdapter2, blobStore2 as unknown as BlobStore, mediaConverter); // Cast blobStore
    
    const stringStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(dumpedJsonLines));
        controller.close();
      }
    });

    await fs2.undump(stringStream);
    await fs2.open();

    const newRoot = await fs2.getRoot() as FSAFolder;
    const folder1Entry = await newRoot.getEntryByName('MyFolder');
    expect(folder1Entry).not.toBeNull();
    const newFolder1 = await fs2.getNode(folder1Entry![2]) as FSAFolder;
    expect(newFolder1).toBeInstanceOf(FSAFolder);
    
    const file1Entry = await newFolder1.getEntryByName('MyFile.txt');
    expect(file1Entry).not.toBeNull();
    const newFile1 = await fs2.getNode(file1Entry![2]) as FSAFile;
    expect(newFile1).toBeInstanceOf(FSAFile);
    expect(await newFile1.read()).toBe('Content of file1');

    const imageFileEntry = await newFolder1.getEntryByName('MyImage.png');
    expect(imageFileEntry).not.toBeNull();
    const newImageFile = await fs2.getNode(imageFileEntry![2]) as FSAFile;
    expect(newImageFile).toBeInstanceOf(FSAFile);
    const readCanvas = await newImageFile.readMediaResource() as unknown as Canvas;
    expect(readCanvas.width).toBe(5);
    const imageColor = getCenterPixelRGBA(readCanvas);
    expect(imageColor).toEqual([0, 0, 255, 255]);

    // await mockRootHandle2.removeEntry(dbFileName2).catch(() => {}); // dbFileName2 is not defined
    // To clean up, we might need to remove the db file by its name if SqlJsAdapter creates it predictably
    // For now, this cleanup step is removed as dbFileName is not passed to SqlJsAdapter.
  });
});

/**
 * node-canvasのCanvasから中央ピクセルのRGBA値([r,g,b,a])を取得する関数
 * @param canvas node-canvasのCanvas
 * @returns [r, g, b, a] (0-255)
 */
function getCenterPixelRGBA(canvas: Canvas): [number, number, number, number] {
  const ctx = canvas.getContext('2d');
  const x = Math.floor(canvas.width / 2);
  const y = Math.floor(canvas.height / 2);
  const imageData = ctx.getImageData(x, y, 1, 1);
  const [r, g, b, a] = imageData.data;
  return [r, g, b, a];
}
