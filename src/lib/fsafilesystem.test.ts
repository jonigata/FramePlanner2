import { assert, describe, it, expect } from 'vitest';
import type { Canvas } from 'canvas';
import { createCanvas } from 'canvas';
import { openAsBlob } from 'fs';

import { beforeEach, afterEach, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import type * as sqlJs from 'sql.js';
import path from 'path';

// FSAFileSystem 関連の import
import { FSAFileSystem, FSAFile, FSAFolder } from './filesystem/fsaFileSystem'; // FSAFilePersistenceProvider is no longer used directly
import { SqlJsAdapter, type FilePersistenceProvider } from './filesystem/sqlite/SqlJsAdapter';
import { type BlobStore } from './filesystem/sqlite/BlobStore';
import type { NodeId, MediaResource } from './filesystem/fileSystem';
import { NodeCanvasMediaConverter, checkFileSystem, checkLoad } from '../../test/helpers';
import { IndexedDBFileSystem } from './filesystem/indexeddbFileSystem';

// Mock FilePersistenceProvider
class MockPersistenceProvider implements FilePersistenceProvider {
  private files: Map<string, Uint8Array | string> = new Map();

  async readFile(name: string): Promise<Uint8Array | null> {
    const data = this.files.get(name);
    if (data instanceof Uint8Array) {
      return data;
    }
    if (typeof data === 'string') {
      return new TextEncoder().encode(data);
    }
    return null;
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    this.files.set(name, data);
  }

  async removeFile(name: string): Promise<void> {
    this.files.delete(name);
  }

  async readText(name: string): Promise<string | null> {
    const data = this.files.get(name);
    if (typeof data === 'string') {
      return data;
    }
    if (data instanceof Uint8Array) {
      return new TextDecoder().decode(data);
    }
    return null;
  }

  async writeText(name: string, text: string): Promise<void> {
    this.files.set(name, text);
  }
}

// Mock BlobStore
class MockBlobStore implements BlobStore {
  private blobs: Map<NodeId | string, Blob> = new Map();
  constructor() {} // Removed dirHandle dependency

  async open(): Promise<void> { /* no-op for mock */ } // dirHandle is no longer needed
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
  let persistenceProvider: MockPersistenceProvider;
  let sqliteAdapter: SqlJsAdapter;
  let blobStore: MockBlobStore;
  let mediaConverter: NodeCanvasMediaConverter; // Existing class
  let fs: FSAFileSystem;
  const dbFileName = 'test-fsa.sqlite';

  beforeEach(async () => {
    persistenceProvider = new MockPersistenceProvider();
    
    // SqlJsAdapter のコンストラクタ引数の順番を修正し、wasmPath を渡す
    sqliteAdapter = new SqlJsAdapter(persistenceProvider, wasmPath);
    blobStore = new MockBlobStore();
    mediaConverter = new NodeCanvasMediaConverter(); // Use existing class

    fs = new FSAFileSystem(sqliteAdapter, blobStore as unknown as BlobStore, mediaConverter); // Cast blobStore
    await fs.open(); // ここで SqlJsAdapter.open() が呼ばれ、内部で initSqlJs が wasmPath を使って実行される
  });

  afterEach(async () => {
    // The database file is now managed by MockPersistenceProvider in memory,
    // so explicit removal from a mock directory handle is no longer needed.
    // SqlJsAdapter will use persistenceProvider.removeFile(dbFileName) internally if needed.
    await persistenceProvider.removeFile(dbFileName);
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

  async function checkCopy(filename: string) {
    const fs2 = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs2.open("testdb");

    // Load test data
    const blob = await openAsBlob(filename);
    await fs2.undump(blob.stream());
    
    await checkFileSystem(fs2);

    const readable = await fs2.dump({ onProgress: p => { console.log("dump:", p); } });
    await fs.undump(readable, { onProgress: p => { console.log("undump:", p); } });

    await checkFileSystem(fs);
  }


  it('should dump and undump filesystem content', async () => {
    await checkCopy('testdata/dump/testcase-v2.ndjson');
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

