import { writable, type Writable } from "svelte/store";
import type { FileSystem, Folder, File, NodeId, BindId } from "../lib/filesystem/fileSystem.js";
import type { Page, Book, SerializedBook, SerializedPage } from "../lib/book/book";
import { commitBook } from "../lib/book/book";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { ulid } from 'ulid';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { protocolChatLogToRichChatLog, richChatLogToProtocolChatLog } from "$bookTypes/richChat";
import { emptyNotebook } from "$bookTypes/notebook";
import { storeFrameImages, storeBubbleImages, fetchFrameImages, fetchBubbleImages } from "./fileImages";
import { writeEnvelope, readEnvelope } from "../lib/book/envelope";
import { dryUnpackBubbleMedias, dryUnpackFrameMedias } from "../lib/book/imagePacking";

export type Dragging = {
  fileSystem: FileSystem;
  bindId: BindId;
  parent: NodeId;
}

export type LoadToken = {
  fileSystem: FileSystem;
  nodeId: NodeId;
}

export const fileManagerOpen = writable(false);
export const fileManagerDragging: Writable<Dragging | null> = writable(null);
export const newBookToken: Writable<Book | null> = writable(null);
export const saveBubbleToken: Writable<Bubble | null> = writable(null);
export const fileSystem: Writable<FileSystem | null> = writable(null);
export const fileManagerUsedSizeToken: Writable<FileSystem | null> = writable(null);
export const loadToken: Writable<LoadToken | null> = writable(null);
export const fileManagerMarkedFlag = writable(false);
export const mainBookFileSystem: Writable<FileSystem | null> = writable(null);

export async function saveBookTo(book: Book, fileSystem: FileSystem, file: File): Promise<void> {
  console.tag("saveBookTo", "cyan", file.id);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;
  const videoFolder = (await root.getNodesByName('動画'))[0] as Folder;

  const serializedBook: SerializedBook = {
    revision: book.revision,
    pages: [],
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: richChatLogToProtocolChatLog(book.chatLogs),
    notebook: book.notebook,
  };
  for (const page of book.pages) {
    const markUp = await storeFrameImages(page.frameTree, fileSystem, imageFolder, videoFolder, 'v');
    const bubbles = await storeBubbleImages(page.bubbles, fileSystem, imageFolder, videoFolder, page.paperSize);
    
    const serializedPage: SerializedPage = {
      id: page.id,
      frameTree: markUp,
      bubbles: bubbles,
      paperSize: page.paperSize,
      paperColor: page.paperColor,
      frameColor: page.frameColor,
      frameWidth: page.frameWidth,
    }
    serializedBook.pages.push(serializedPage);    
  }

  const json = JSON.stringify(serializedBook);
  await file.write(json);
}

export function serializeBook(book: Book): SerializedBook {
  return {
    revision: book.revision,
    pages: book.pages.map(page => serializePage(page)),
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: richChatLogToProtocolChatLog(book.chatLogs),
    notebook: book.notebook,
  }
}

function serializePage(page: Page): SerializedPage {
  return {
    id: page.id,
    frameTree: FrameElement.decompileNode(page.frameTree, 'v'),
    bubbles: page.bubbles.map(bubble => Bubble.decompile(bubble)),
    paperSize: page.paperSize,
    paperColor: page.paperColor,
    frameColor: page.frameColor,
    frameWidth: page.frameWidth,
  }
}

export async function loadBookFrom(fileSystem: FileSystem, file: File): Promise<Book> {
  console.tag("loadBookFrom", "cyan", file.id);
  performance.mark("loadBookFrom-start");
  const content = await file.read();
  const serializedBook: SerializedBook = JSON.parse(content);

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    const serializedPage = serializedBook as any as SerializedPage;
    const frameTree = await fetchFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await fetchBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);
    return await wrapPageAsBook(serializedBook, frameTree, bubbles);
  }

  const chatLogs = protocolChatLogToRichChatLog(serializedBook.chatLogs ?? []);

  const book: Book = {
    revision: serializedBook.revision,
    pages: [],
    history: {
      entries: [],
      cursor: 0,
    },
    direction: serializedBook.direction ?? 'right-to-left',
    wrapMode: serializedBook.wrapMode ?? 'none',
    chatLogs,
    notebook: serializedBook.notebook ?? emptyNotebook(),
  };

  performance.mark("loadBookFrom-images-start");
  for (const serializedPage of serializedBook.pages) {
    const frameTree = await fetchFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await fetchBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);

    const page: Page = {
      id: serializedPage.id ?? ulid(),
      frameTree: frameTree,
      bubbles: bubbles,
      paperSize: serializedPage.paperSize,
      paperColor: serializedPage.paperColor,
      frameColor: serializedPage.frameColor,
      frameWidth: serializedPage.frameWidth,
      source: null,
    };
    book.pages.push(page);
  }
  performance.mark("loadBookFrom-images-end");
  performance.measure("loadBookFrom-images", "loadBookFrom-images-start", "loadBookFrom-images-end");
  commitBook(book, null);

  performance.mark("loadBookFrom-end");
  performance.measure("loadBookFrom", "loadBookFrom-start", "loadBookFrom-end");

  return book;
}

async function wrapPageAsBook(serializedPage: any, frameTree: FrameElement, bubbles: Bubble[]): Promise<Book> {
  const page: Page = {
    id: serializedPage.id ?? ulid(),
    frameTree: frameTree,
    bubbles: bubbles,
    paperSize: serializedPage.paperSize,
    paperColor: serializedPage.paperColor,
    frameColor: serializedPage.frameColor,
    frameWidth: serializedPage.frameWidth,
    source: null,
  };

  const book: Book = {
    revision: serializedPage.revision,
    pages: [page],
    history: {
      entries: [],
      cursor: 0,
    },
    direction: 'right-to-left',
    wrapMode: 'none',
    chatLogs: [],
    notebook: emptyNotebook(),
  };
  commitBook(book, null);

  return book;
}

export async function newFile(fs: FileSystem, folder: Folder, name: string, book: Book): Promise<{file: File, bindId: BindId}> {
  const file = await fs.createFile();
  book.revision.id = file.id;

  console.tag("newFile", "cyan");
  await saveBookTo(book, fs, file);
  const bindId = await folder.link(name, file.id);
  return { file, bindId };
}

export function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');  // 月は0から始まるため+1します
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}  

export async function saveBubbleTo(bubble: Bubble, file: File) {
  const markUp = Bubble.decompile(bubble);
  const json = JSON.stringify(markUp);
  await file.write(json);
}

// 歴史的事情により、古いバージョンから読み込むときはpaperSizeを指定する必要がある
export async function loadBubbleFrom(paperSize: Vector, file: File): Promise<Bubble> {
  const content = await file.read();
  const markUp = JSON.parse(content);
  const bubble = Bubble.compile(paperSize, markUp);
  return bubble;
}

export async function dryLoadBookFrom(fileSystem: FileSystem, file: File, images: NodeId[]) { // ガベコレの調査用
  const content = await file.read();
  let serializedBook = JSON.parse(content);

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    serializedBook = {
      pages: [serializedBook],
    }
  }

  for (const serializedPage of serializedBook.pages) {
    await dryUnpackFrameMedias(serializedPage.paperSize, serializedPage.frameTree, images);
    await dryUnpackBubbleMedias(serializedPage.paperSize, serializedPage.bubbles, images);
  }
}

export async function saveMaterialCanvas(fileSystem: FileSystem, canvas: HTMLCanvasElement): Promise<BindId> {
  const root = await fileSystem.getRoot();
  const materialFolder = (await root.getNodesByName('素材'))[0] as Folder;
  const file = await fileSystem.createFile();
  await file.writeCanvas(canvas);
  return await materialFolder.link(file.id, file.id);
}

export async function deleteMaterialCanvas(fileSystem: FileSystem, materialBindId: BindId): Promise<void> {
  const root = await fileSystem.getRoot();
  const materialFolder = (await root.getNodesByName('素材'))[0] as Folder;
  const nodeId = (await materialFolder.getEntry(materialBindId))![2];
  await materialFolder.unlink(materialBindId);
  await fileSystem.destroyNode(nodeId);
}

export async function copyBookOrFolderInterFileSystem(sourceFileSystem: FileSystem, targetFileSystem: FileSystem, sourceNodeId: NodeId): Promise<NodeId> {
  return copyBookOrFolderInterFileSystemInternal(sourceFileSystem, targetFileSystem, sourceNodeId, {});
}

async function copyBookOrFolderInterFileSystemInternal(sourceFileSystem: FileSystem, targetFileSystem: FileSystem, sourceNodeId: NodeId, copied: { [NodeId: string]: NodeId }): Promise<NodeId> {
  if (copied[sourceNodeId]) {
    return copied[sourceNodeId];
  }

  const sourceNode = (await sourceFileSystem.getNode(sourceNodeId))!;
  const sourceFolder = sourceNode.asFolder();
  if (sourceFolder) {
    const targetFolder = await targetFileSystem.createFolder();
    copied[sourceNodeId] = targetFolder.id;

    const entries = await sourceFolder.list();
    for (const entry of entries) {
      const sourceChildNodeId = entry[2];
      const targetChildNodeId = await copyBookOrFolderInterFileSystemInternal(sourceFileSystem, targetFileSystem, sourceChildNodeId, copied);
      await targetFolder.link(entry[1], targetChildNodeId);
    }
    return targetFolder.id;
  } else {
    // file is book
    async function justCopy() {
      const sourceFile = sourceNode.asFile()!;
      const book = await loadBookFrom(sourceFileSystem, sourceFile);
  
      const targetFile = await targetFileSystem.createFile('text');
      book.revision.id = targetFile.id;
      await saveBookTo(book, targetFileSystem, targetFile);
      return targetFile.id;
    }

    if (sourceFileSystem.isVault) {
      if (targetFileSystem.isVault) {
        // Vault -> Vault
        console.log("================ Vault -> Vault");
        return await justCopy();
      } else {
        // Vault -> Local
        console.log("================ Vault -> Local");
        const sourceFile = sourceNode.asFile()!;
        const blob = await sourceFile.readBlob();
        const targetFile = await targetFileSystem.createFile();
        const importedBook = await readEnvelope(blob);
        importedBook.revision.id = targetFile.id;
        saveBookTo(importedBook, targetFileSystem, targetFile);
        return targetFile.id;
      }
    } else {
      if (targetFileSystem.isVault) {
        // Local -> Vault
        console.log("================ Local -> Vault");
        const sourceFile = sourceNode.asFile()!;
        const book = await loadBookFrom(sourceFileSystem, sourceFile);
        const blob = await writeEnvelope(book);
        const targetFile = await targetFileSystem.createFile();
        await targetFile.writeBlob(blob);
        return targetFile.id;
      } else {
        // Local -> Local        
        console.log("================ Local -> Local");
        return await justCopy();
      }
    }
  }
}
