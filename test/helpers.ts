import { expect, assert } from 'vitest';
import { openAsBlob } from 'fs';
import type { Canvas } from 'canvas';
// Removed import of blobToDataURL and dataURLtoBlob from mediaConverter
import type { MediaConverter } from '../src/lib/filesystem/mediaConverter';
import type { MediaResource, RemoteMediaReference } from '../src/lib/filesystem/fileSystem';
import type { Book } from '../src/lib/book/book';
import { loadBookFrom } from '../src/filemanager/fileManagerStore';
import { FileSystem, Folder } from '../src/lib/filesystem/fileSystem';
import { loadCharactersFromRoster } from '../src/notebook/rosterStore';

export class NodeCanvasMediaConverter implements MediaConverter {
  async toStorable(
    media: MediaResource
  ): Promise<{ blob?: Blob; remote?: RemoteMediaReference; content?: string; mediaType?: string }> {
    // node-canvasのCanvasの場合
    if (this.isNodeCanvas(media)) {
      return { blob: media as unknown as Blob, mediaType: 'image' };
    }
    console.error("MEDIA", media);
    throw new Error('Unsupported media type for NodeCanvasMediaConverter');
  }

  async fromStorable(record: {
    blob?: Blob;
    remote?: RemoteMediaReference;
    content?: string;
    mediaType?: string;
  }): Promise<MediaResource> {
    if (record.blob && record.mediaType === 'image') {
      // toStorableで作成されたBlobであることを前提とする
      // Node.jsのBlobはarrayBuffer()メソッドを持つ
      return record.blob as unknown as MediaResource;
    }
    console.error("MEDIA", record);
    throw new Error('Unsupported storable for NodeCanvasMediaConverter');
  }

  private isNodeCanvas(obj: unknown): obj is Canvas {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as Canvas).toBuffer === 'function' &&
      typeof (obj as Canvas).getContext === 'function'
    );
  }

  async blobToDataURL(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:${blob.type};base64,${base64}`;
  }

  async dataURLtoBlob(dataURL: string): Promise<Blob> {
    const parts = dataURL.split(',');
    if (parts.length !== 2) {
      throw new Error('Invalid data URL format');
    }
    const meta = parts[0];
    const base64Data = parts[1];
    
    const mimeMatch = meta.match(/data:([^;]+);base64/);
    if (!mimeMatch) {
      throw new Error('Invalid data URL format: missing MIME type or base64 specifier');
    }
    const mime = mimeMatch[1];
    
    const buffer = Buffer.from(base64Data, 'base64');
    // Assuming Node.js global Blob is available, or it's polyfilled.
    // For explicit import: import { Blob } from 'buffer';
    return new globalThis.Blob([buffer], { type: mime });
  }
}

/**
 * node-canvasのCanvasから真ん中のピクセルのRGBA値を取得する
 * @param canvas node-canvasのCanvasオブジェクト
 * @returns 真ん中のピクセルのRGBA値 {r: number, g: number, b: number, a: number}
 */
export function getCenterPixel(canvas: Canvas): { r: number; g: number; b: number; a: number } {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // 真ん中の座標を計算（整数に丸める）
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  // 1ピクセルのImageDataを取得
  const imageData = ctx.getImageData(centerX, centerY, 1, 1);
  const data = imageData.data;
  
  return {
    r: data[0],  // Red
    g: data[1],  // Green
    b: data[2],  // Blue
    a: data[3]   // Alpha
  };
}


export async function checkFileSystem(fs: FileSystem) {
  const root = (await fs.getRoot())!;
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
  
      const node = (await fs.getNode(id))!;
      expect(node).not.toBeNull();
      console.log(`${indent}${totalProcessed.count}/${entries.length} "${name}" (${node.getType()})`);
  
      if (node.getType() === 'folder') {
        console.log(`${indent}Loading child folder: "${name}"`);
        processedCount += await loadBooksFromFolder(node.asFolder()!, name, depth + 1, totalProcessed);
      } else {
        try {
          const book = await loadBookFrom(fs, node.asFile()!);
          books.push(book);
          processedCount++;
        } catch (e) {
          console.error(`${indent}Error loading book from "${name}":`, e);
          throw e;
        }
      }
    }
  
    return processedCount;
  }

  // Load books from Desktop and Cabinet
  await loadBooksFromFolder((await root.getEmbodiedEntryByName('デスクトップ'))![2].asFolder()!, 'デスクトップ');
  await loadBooksFromFolder((await root.getEmbodiedEntryByName('キャビネット'))![2].asFolder()!, 'キャビネット');

  // Verify books were found
  expect(books.length).toBe(5);

  // Verify basic book structure
  for (const book of books) {
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
  // 頑張ったけどwebpに対応してないので折れた

  const characters = await loadCharactersFromRoster(fs);
  expect(characters.length).toBe(1);
  expect(characters[0].name).toBe('太郎');
  expect(characters[0].appearance).toBe('黒毛の犬');
}

export async function checkUndump(fs: FileSystem, filename: string) {
  // Load test data
  const blob = await openAsBlob(filename);
  await fs.undump(blob.stream());

  await checkFileSystem(fs);
}
