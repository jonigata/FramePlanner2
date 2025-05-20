import { describe, it, expect, assert } from 'vitest';
import { IndexedDBFileSystem } from './filesystem/indexeddbFileSystem';
import type { Book } from './book/book';
import { openAsBlob } from 'fs';
import { loadBookFrom } from '../filemanager/fileManagerStore';
import { FileSystem, Folder } from './filesystem/fileSystem';

describe('Book loading from filesystem', () => {
  async function checkFileSystem(fs: FileSystem) {
    const root = await fs.getRoot();
    expect(root).not.toBeNull();
    const books: Book[] = [];

    const titles: { [key: string]: string } = {};

    // FramePlanner FileSystemではディレクトリに同じ名前のファイルが存在しうる
    // (特定したいならBindIdを使う)が、テストケースでは同じ名前のファイルは存在しないので
    // 一意に特定できるものとする
    async function loadBooksFromFolder(
      folder: Folder,
      folderName: string,
      depth: number = 0,
      totalProcessed = { count: 0 }
    ): Promise<number> {
      const entries = await folder.asFolder()!.list();
      let processedCount = 0;
      const indent = '  '.repeat(depth);
      console.log(`${indent}folder "${folderName}" has ${entries.length} entries`);
    
      for (const [, name, id] of entries) {
        totalProcessed.count++;
        titles[id] = name;
    
        const node = await fs.getNode(id);
        expect(node).not.toBeNull();
        console.log(`${indent}${totalProcessed.count}/${entries.length} "${name}" (${node.getType()})`);
    
        if (node.getType() === 'folder') {
          console.log(`${indent}Loading child folder: "${name}"`);
          processedCount += await loadBooksFromFolder(node.asFolder(), name, depth + 1, totalProcessed);
        } else {
          try {
            const book = await loadBookFrom(fs, node.asFile()!);
            books.push(book);
            processedCount++;
          } catch (e) {
            console.log(`${indent}Skipping non-book file: ${name}`);
          }
        }
      }
    
      return processedCount;
    }

    // Load books from Desktop and Cabinet
    await loadBooksFromFolder((await root.getEmbodiedEntryByName('デスクトップ'))[2].asFolder(), 'デスクトップ');
    await loadBooksFromFolder((await root.getEmbodiedEntryByName('キャビネット'))[2].asFolder(), 'キャビネット');

    // Verify books were found
    expect(books.length).toBe(5);

    // Verify basic book structure
    for (const book of books) {
      console.log(titles[book.revision.id], { revision: book.revision, pages: book.pages.length, direction: book.direction, wrapMode: book.wrapMode });
      expect(book.revision.id).toBeDefined();
      expect(book.pages).toBeInstanceOf(Array);
    }
    expect(books[0].pages.length).toBe(1);
    expect(books[1].pages.length).toBe(2);
    expect(books[2].pages.length).toBe(3);
    expect(books[3].pages[0].bubbles.length).toBe(1);
    expect(books[4].pages[0].bubbles.length).toBe(2);
    // console.log(books[3].pages[0].frameTree.children[1].children[1].filmStack.films[0]);
    // 画像のテストは厳しい、nodeでcanvasを使うのが大変なため
  }

  it('should load all books from Desktop and Cabinet', async () => {
    const fs = new IndexedDBFileSystem();
    await fs.open("testdb");
    
    // Load test data
    // const blob = await openAsBlob('filesystem-dump.ndjson');
    const blob = await openAsBlob('testdata/dump/testcase.ndjson');
    await fs.undump(blob.stream());

    await checkFileSystem(fs);
  }, 180 * 1000);

  it('should obtain same hierarchy from dumped and undumped data', async () => {
    const fs = new IndexedDBFileSystem();
    await fs.open("testdb");

    // Load test data
    const blob = await openAsBlob('testdata/dump/testcase.ndjson');
    await fs.undump(blob.stream());

    await checkFileSystem(fs);

    const fs2 = new IndexedDBFileSystem();
    await fs2.open("testdb2");
    const readable = await fs.dump({ onProgress: p => { console.log("dump:", p); } });
    await fs2.undump(readable, { onProgress: p => { console.log("undump:", p); } });

    await checkFileSystem(fs2);
  });
}, 180 * 1000);
