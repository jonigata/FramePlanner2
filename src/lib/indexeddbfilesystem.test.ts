import { describe, it, expect } from 'vitest';
import { openAsBlob } from 'fs';

import { IndexedDBFileSystem } from './filesystem/indexeddbFileSystem';
import { NodeCanvasMediaConverter, checkFileSystem, checkUndump } from '../../test/helpers';


describe('Book loading from filesystem', () => {
  it('デスクトップとキャビネットからすべてのbookをロードできる(v1)', async () => {
    const fs = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs.open("testdb");
    await checkUndump(fs, 'testdata/dump/testcase-v1.ndjson');
  });

  it('デスクトップとキャビネットからすべてのbookをロードできる(v2)', async () => {
    const fs = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs.open("testdb");
    await checkUndump(fs, 'testdata/dump/testcase-v2.ndjson');
  });

  async function checkCopy(filename: string) {
    const fs = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs.open("testdb");

    // Load test data
    const blob = await openAsBlob(filename);
    await fs.undump(blob.stream());
    
    await checkFileSystem(fs);

    const fs2 = new IndexedDBFileSystem(new NodeCanvasMediaConverter());
    await fs2.open("testdb2");
    const readable = await fs.dump({ onProgress: p => { console.log("dump:", p); } });
    await fs2.undump(readable, { onProgress: p => { console.log("undump:", p); } });

    await checkFileSystem(fs2);
  }

  it('dump->undumpで再現できる(v1)', async () => {
    await checkCopy('testdata/dump/testcase-v1.ndjson');
  });

  it('dump->undumpで再現できる(v2)', async () => {
    await checkCopy('testdata/dump/testcase-v2.ndjson');
  });
}, 180 * 1000);
