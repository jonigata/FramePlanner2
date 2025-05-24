import { assert, describe, it, expect } from 'vitest';
import type { Canvas } from 'canvas';
import { createCanvas } from 'canvas';
import { openAsBlob } from 'fs';

import { beforeEach, afterEach, beforeAll } from 'vitest';
import initSqlJs from 'sql.js';
import type * as sqlJs from 'sql.js';
import path from 'path';

// FSAFileSystem 関連の import
import { FSAFileSystem, FSAFile, FSAFolder } from './filesystem/fsaFileSystem';
import { SqlJsAdapter, type FilePersistenceProvider } from './filesystem/sqlite/SqlJsAdapter';
import { type BlobStore } from './filesystem/sqlite/BlobStore';
import type { FileSystem, NodeId, MediaResource } from './filesystem/fileSystem';
import { NodeCanvasMediaConverter, checkFileSystem, checkUndump } from '../../test/helpers'; // checkLoad は未使用なので削除
import { IndexedDBFileSystem } from './filesystem/indexeddbFileSystem';

// Mock FilePersistenceProvider
class MockPersistenceProvider implements FilePersistenceProvider {
  private files: Map<string, Uint8Array | string> = new Map();
  private dbName: string;

  constructor(dbName: string) {
    this.dbName = dbName; // 特定のDB名を管理するため
  }

  async readFile(name: string): Promise<Uint8Array | null> {
    if (name !== this.dbName) return null; // このプロバイダが管理するDBファイルのみ対象
    const data = this.files.get(this.dbName);
    if (data instanceof Uint8Array) {
      return data;
    }
    if (typeof data === 'string') {
      return new TextEncoder().encode(data);
    }
    return null;
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (name !== this.dbName) return; // このプロバイダが管理するDBファイルのみ対象
    this.files.set(this.dbName, data);
  }

  async removeFile(name: string): Promise<void> {
    if (name !== this.dbName) return; // このプロバイダが管理するDBファイルのみ対象
    this.files.delete(this.dbName);
  }

  async readText(name: string): Promise<string | null> {
    if (name !== this.dbName) return null;
    const data = this.files.get(this.dbName);
    if (typeof data === 'string') {
      return data;
    }
    if (data instanceof Uint8Array) {
      return new TextDecoder().decode(data);
    }
    return null;
  }

  async writeText(name: string, text: string): Promise<void> {
    if (name !== this.dbName) return;
    this.files.set(this.dbName, text);
  }
}

// Mock BlobStore
class MockBlobStore implements BlobStore {
  private blobs: Map<NodeId | string, Blob> = new Map();
  constructor() {}

  async open(): Promise<void> { /* no-op for mock */ }
  async read(idOrPath: NodeId | string): Promise<Blob> {
    const blob = this.blobs.get(idOrPath);
    if (!blob) throw new Error(`Blob ${idOrPath} not found in MockBlobStore`);
    return blob;
  }
  async write(id: string, blob: Blob): Promise<string> {
    const blobPath = `blobs/${id}.bin`;
    this.blobs.set(id as NodeId, blob);
    this.blobs.set(blobPath, blob);
    return blobPath;
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
  async gc(): Promise<void> { /* no-op for mock */ }
}

let SQL: sqlJs.SqlJsStatic;
let wasmPath: string;

beforeAll(async () => {
  wasmPath = path.resolve(`node_modules/sql.js/dist/sql-wasm.wasm`);
  SQL = await initSqlJs({
    locateFile: () => wasmPath
  });
});

describe('FSAFileSystem tests', () => {
  let persistenceProvider: MockPersistenceProvider;
  let fs: FSAFileSystem;
  const dbFileName = 'test-fsa.sqlite';

  let persistenceProvider2: MockPersistenceProvider;
  let fs2: FSAFileSystem;
  const dbFileName2 = 'test-fsa2.sqlite';

  let mediaConverter: NodeCanvasMediaConverter; // 共有

  beforeEach(async () => {
    mediaConverter = new NodeCanvasMediaConverter();

    // fs の初期化
    persistenceProvider = new MockPersistenceProvider(dbFileName);
    const sqliteAdapter = new SqlJsAdapter(persistenceProvider, wasmPath);
    const blobStore = new MockBlobStore();
    fs = new FSAFileSystem(sqliteAdapter, blobStore as unknown as BlobStore, mediaConverter);
    await fs.open();

    // fs2 の初期化
    persistenceProvider2 = new MockPersistenceProvider(dbFileName2);
    const sqliteAdapter2 = new SqlJsAdapter(persistenceProvider2, wasmPath);
    const blobStore2 = new MockBlobStore();
    fs2 = new FSAFileSystem(sqliteAdapter2, blobStore2 as unknown as BlobStore, mediaConverter);
    await fs2.open();
  });

  afterEach(async () => {
    // FSAFileSystem に close メソッドがあればそれを呼ぶのが望ましい
    // 例: await fs.close(); await fs2.close();
    // ここでは persistenceProvider を直接操作してファイルを削除する
    if (persistenceProvider) {
      await persistenceProvider.removeFile(dbFileName);
    }
    if (persistenceProvider2) {
      await persistenceProvider2.removeFile(dbFileName2);
    }
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
    const color = getCenterPixelRGBA(readResource);
    expect(color).toEqual([255, 0, 0, 255]);
  });

  async function checkCopy(sourceFs: FileSystem, targetFs: FileSystem, testfileName: string) {
    // この関数は FSAFileSystem 同士のコピーをテストするために変更
    // 元の checkCopy は IndexedDBFileSystem を使っていたが、
    // ここでは beforeEach で作成された fs と fs2 (または引数で渡されたもの) を使う

    // 1. sourceFs にテストデータをロード (undump を使用)
    const blob = await openAsBlob(testfileName); // 'testdata/dump/testcase-v2.ndjson'
    await sourceFs.undump(blob.stream(), { onProgress: (p: any) => { console.log("sourceFs undump:", p); } });
    await checkFileSystem(sourceFs);

    // 2. sourceFs からデータをダンプ
    const readable = await sourceFs.dump({ onProgress: (p: any) => { console.log("sourceFs dump:", p); } });

    // 3. ダンプしたデータを targetFs にアンダンプ
    await targetFs.undump(readable, { onProgress: (p: any) => { console.log("targetFs undump:", p); } });

    // 4. targetFs の内容を検証
    await checkFileSystem(targetFs);

    // オプション: targetFs から再度ダンプして、sourceFs のダンプ結果と比較することも可能
  }

  it('文字列化', async () => {
    await checkUndump(fs, 'testdata/dump/testcase-v1.ndjson');
    const readable = await fs.dump({});
    const reader = readable.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.done) {
        done = true;
      } else {
        chunks.push(result.value);
      }
    }

    // Concatenate chunks into a single Uint8Array
    const totalLength = chunks.reduce((len, chunk) => len + chunk.length, 0);
    const combinedUint8 = new Uint8Array(totalLength);
    let position = 0;
    for (const chunk of chunks) {
      combinedUint8.set(chunk, position);
      position += chunk.length;
    }

    // Convert to string
    const text = new TextDecoder().decode(combinedUint8);
    console.log(text);
  });


  it('デスクトップとキャビネットからすべてのbookをロードできる(v1)', async () => {
    await checkUndump(fs, 'testdata/dump/testcase-v1.ndjson');
  });

  it('デスクトップとキャビネットからすべてのbookをロードできる(v2)', async () => {
    await checkUndump(fs, 'testdata/dump/testcase-v2.ndjson');
  });

  it('dump(indexeddb)->undumpで再現できる(v1)', async () => {
    const fs = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs.open("testdb");
    await checkCopy(fs, fs2, 'testdata/dump/testcase-v1.ndjson');
  });
  it('dump(indexeddb)->undumpで再現できる(v2)', async () => {
    const fs = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs.open("testdb");
    await checkCopy(fs, fs2, 'testdata/dump/testcase-v2.ndjson');
  });

  it('dump->undumpで再現できる(v1)', async () => {
    await checkCopy(fs, fs2, 'testdata/dump/testcase-v1.ndjson');
  });
  it('dump->undumpで再現できる(v2)', async () => {
    await checkCopy(fs, fs2, 'testdata/dump/testcase-v2.ndjson');
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
