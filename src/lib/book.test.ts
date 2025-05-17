import { describe, it, expect, beforeAll } from 'vitest';
import { IndexedDBFileSystem } from './filesystem/indexeddbFileSystem';
import type { Book } from './book/book';
import { openAsBlob } from 'fs';
import { loadBookFrom } from '../filemanager/fileManagerStore';

describe('Book loading from filesystem', () => {
  let fs: IndexedDBFileSystem;

  beforeAll(async () => {
    fs = new IndexedDBFileSystem();
    await fs.open("testdb");
    
    // Load test data
    // const blob = await openAsBlob('filesystem-dump.ndjson');
    const blob = await openAsBlob('testdata/share.ndjson');
    await fs.undump(blob.stream(), { onProgress: () => {} });
  });

  it('should load all books from Desktop and Cabinet', async () => {
    const root = await fs.getRoot();
    const books: Book[] = [];

    const titles: { [key: string]: string } = {};

    async function loadBooksFromFolder(
      folderName: string, 
      visited = new Set<string>(), 
      depth = 0,
      totalProcessed = { count: 0 }
    ): Promise<number> {
      const entry = await root.getEntryByName(folderName);
      expect(entry).not.toBeNull();
      if (!entry) return 0;
    
      const folder = await fs.getNode(entry[2]);
      expect(folder).not.toBeNull();
      if (!folder) return 0;
    
      const entries = await folder.asFolder()!.list();
      let processedCount = 0;
      const indent = '  '.repeat(depth);
    
      for (const [, name, id] of entries) {
        if (visited.has(id)) continue;
        visited.add(id);
    
        totalProcessed.count++;
        console.log(`${indent}${totalProcessed.count}/${entries.length} ${name}`);
        titles[id] = name;
    
        const node = await fs.getNode(id);
        if (!node) continue;
    
        if (node.getType() === 'folder') {
          processedCount += await loadBooksFromFolder(name, visited, depth + 1, totalProcessed);
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
    await loadBooksFromFolder('デスクトップ');
    await loadBooksFromFolder('キャビネット');

    // Verify books were found
    expect(books.length).toBeGreaterThan(0);
    
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