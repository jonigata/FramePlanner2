import { describe, it, expect, beforeAll } from 'vitest';
import { IndexedDBFileSystem } from './filesystem/indexeddbFileSystem';
import type { Book } from './book/book';
import { openAsBlob } from 'fs';
import { loadBookFrom } from '../filemanager/fileManagerStore';
import { Folder } from './filesystem/fileSystem';

describe('Book loading from filesystem', () => {
  let fs: IndexedDBFileSystem;

  beforeAll(async () => {
    fs = new IndexedDBFileSystem();
    await fs.open("testdb");
    
    // Load test data
    // const blob = await openAsBlob('filesystem-dump.ndjson');
    const blob = await openAsBlob('testdata/dump/testcase.ndjson');
    await fs.undump(blob, n => {});
  });

  it('should load all books from Desktop and Cabinet', async () => {
    const root = await fs.getRoot();
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
    expect(books[0].pages.length).toBe(1);
    expect(books[1].pages.length).toBe(2);
    expect(books[2].pages.length).toBe(3);
    expect(books[3].pages[0].bubbles.length).toBe(1);
    expect(books[4].pages[0].bubbles.length).toBe(2);
    expect(books.length).toBe(5);
    
    // Verify basic book structure
    for (const book of books) {
      console.log(titles[book.revision.id], { revision: book.revision, pages: book.pages.length, direction: book.direction, wrapMode: book.wrapMode });
      if (book.revision.id === '01J9ZQJMRY2P8ENHHB8K0XRTJB') {
        console.log(book);
      }
      expect(book.revision.id).toBeDefined();
      expect(book.pages).toBeInstanceOf(Array);
      // expect(book.direction).toBeDefined();
      // expect(book.wrapMode).toBeDefined();
    }
  }, 180 * 1000);
}, 180 * 1000);