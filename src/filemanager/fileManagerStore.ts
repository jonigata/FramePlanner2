import { writable, type Writable } from "svelte/store";
import type { FileSystem, Folder, File, NodeId, BindId } from "../lib/filesystem/fileSystem.js";
import type { Page, Book } from "../bookeditor/book.js";
import { commitBook } from "../bookeditor/book.js";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { v4 as uuidv4 } from 'uuid';

export type Dragging = {
  bindId: string;
  parent: string;
}

export const fileManagerOpen = writable(false);
export const trashUpdateToken = writable(false);
export const fileManagerRefreshKey = writable(0);
export const fileManagerDragging: Writable<Dragging> = writable(null);
export const newPageToken: Writable<Page> = writable(null);
export const newBookToken: Writable<Book> = writable(null);
export const newBubbleToken: Writable<Bubble> = writable(null);
export const filenameDisplayMode: Writable<'filename' | 'index'> = writable('filename');
export const fileSystem: Writable<FileSystem> = writable(null);
export const shareBookToken: Writable<Book> = writable(null);

const imageCache: { [fileSystemId: string]: { [fileId: string]: HTMLImageElement } } = {};

type SerializedPage = {
  id: string,
  frameTree: any,
  bubbles: any[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
}

type SerializedBook = {
  revision: {id: string, revision: number, prefix: string},
  pages: SerializedPage[],
}

export async function saveBookTo(book: Book, fileSystem: FileSystem, file: File): Promise<void> {
  console.tag("saveBookTo", "cyan");

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const serializedBook: SerializedBook = {
    revision: book.revision,
    pages: [],
  };
  for (const page of book.pages) {
    const markUp = await packFrameImages(page.frameTree, fileSystem, imageFolder, 'v');
    const bubbles = await packBubbleImages(page.bubbles, fileSystem, imageFolder, page.paperSize);
    
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

async function packFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  // 画像を別ファイルとして保存して
  // 画像をIDに置き換えたマークアップを返す
  const image = frameTree.image;
  const markUp = FrameElement.decompileNode(frameTree, parentDirection);

  if (image) {
    await saveImage(fileSystem, image, imageFolder);
    const fileId = image["fileId"][fileSystem.id];
    markUp.image = fileId;
  }

  const children = [];
  for (const child of frameTree.children) {
    children.push(await packFrameImages(child, fileSystem, imageFolder, frameTree.direction));
  }
  if (0 < children.length) {
    if (frameTree.direction === 'h') { 
      markUp.row = children;
    } else {
      markUp.column = children;
    }
  } 
  return markUp;
}

async function packBubbleImages(bubbles: Bubble[], fileSystem: FileSystem, imageFolder: Folder, paperSize: [number, number]): Promise<any[]> {
  const packedBubbles = [];
  for (const src of bubbles) {
    const image = src.image;
    const bubble = Bubble.decompile(paperSize, src);
    if (image) {
      await saveImage(fileSystem, image.image, imageFolder);
      const fileId = image.image["fileId"][fileSystem.id];
      bubble.image = { ...src.image, image: fileId };
    }
    packedBubbles.push(bubble);
  }
  return packedBubbles;
}


export async function loadBookFrom(fileSystem: FileSystem, file: File): Promise<Book> {
  console.tag("loadBookFrom", "cyan");
  const content = await file.read();
  const serializedBook = JSON.parse(content);

  const root = await fileSystem.getRoot();
  const imageFolder = await root.getNodeByName('画像') as Folder;

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    const serializedPage = serializedBook;
    const frameTree = await unpackFrameImages(serializedPage.frameTree, fileSystem);
    const bubbles = await unpackBubbleImages(serializedPage.bubbles, fileSystem, serializedPage.paperSize);
    return await wrapPageAsBook(serializedBook, frameTree, bubbles);
  }

  const book: Book = {
    revision: serializedBook.revision,
    pages: [],
    history: {
      entries: [],
      cursor: 0,
    },
  };

  for (const serializedPage of serializedBook.pages) {
    const frameTree = await unpackFrameImages(serializedPage.frameTree, fileSystem);
    const bubbles = await unpackBubbleImages(serializedPage.bubbles, fileSystem, serializedPage.paperSize);

    const page: Page = {
      id: serializedPage.id ?? uuidv4(),
      frameTree: frameTree,
      bubbles: bubbles,
      paperSize: serializedPage.paperSize,
      paperColor: serializedPage.paperColor,
      frameColor: serializedPage.frameColor,
      frameWidth: serializedPage.frameWidth,
    };
    book.pages.push(page);
  }
  commitBook(book, null);

  return book;
}

async function wrapPageAsBook(serializedPage: any, frameTree: FrameElement, bubbles: Bubble[]): Promise<Book> {
  const page: Page = {
    id: serializedPage.id ?? uuidv4(),
    frameTree: frameTree,
    bubbles: bubbles,
    paperSize: serializedPage.paperSize,
    paperColor: serializedPage.paperColor,
    frameColor: serializedPage.frameColor,
    frameWidth: serializedPage.frameWidth,
  };

  const book: Book = {
    revision: serializedPage.revision,
    pages: [page],
    history: {
      entries: [],
      cursor: 0,
    },
  };
  commitBook(book, null);

  return book;
}


async function unpackFrameImages(markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  const frameTree = FrameElement.compileNode(markUp);

  if (markUp.image) {
    frameTree.image = await loadImage(fileSystem, markUp.image);
  }

  const children = markUp.column ?? markUp.row;
  if (children) {
    frameTree.direction = markUp.column ? 'v' : 'h';
    frameTree.children = [];
    for (let child of children) {
      frameTree.children.push(await unpackFrameImages(child, fileSystem));
    }
    frameTree.calculateLengthAndBreadth();
  }

  return frameTree;
}

async function unpackBubbleImages(bubbles: any[], fileSystem: FileSystem, paperSize: [number, number]): Promise<Bubble[]> {
  const unpackedBubbles: Bubble[] = [];
  for (const src of bubbles) {
    const image = src.image;
    const bubble: Bubble = Bubble.compile(paperSize, src);
    if (image) {
      bubble.image = { ...image, image: await loadImage(fileSystem, image.image) };
    }
    unpackedBubbles.push(bubble);
  }
  return unpackedBubbles;
}

export async function newFile(fs: FileSystem, folder: Folder, name: string, book: Book): Promise<{file: File, bindId: BindId}> {
  const file = await fs.createFile();
  book.revision.id = file.id;

  console.tag("newFile", "cyan");
  // console.trace();
  await saveBookTo(book, fs, file);
  const bindId = await folder.link(name, file.id);
  return { file, bindId };
}

async function loadImage(fileSystem: FileSystem, imageId: string): Promise<HTMLImageElement> {
  imageCache[fileSystem.id] ??= {};

  if (imageCache[fileSystem.id][imageId]) {
    return imageCache[fileSystem.id][imageId];
  } else {
    const file = (await fileSystem.getNode(imageId as NodeId)).asFile();
    const image = await file.readImage();
    image["fileId"] ??= {}
    image["fileId"][fileSystem.id] = file.id
    imageCache[fileSystem.id][imageId] = image;
    return image;
  }
}

async function saveImage(fileSystem: FileSystem, image: HTMLImageElement, imageFolder: Folder): Promise<void> {
  imageCache[fileSystem.id] ??= {};
  image["fileId"] ??= {}

  const fileId = image["fileId"][fileSystem.id];
  if (imageCache[fileSystem.id][fileId]) {
    return;
  }
  const file = await fileSystem.createFile();
  await file.writeImage(image);
  image["fileId"] ??= {}
  image["fileId"][fileSystem.id] = file.id
  imageCache[fileSystem.id][file.id] = image;
  await imageFolder.link(file.id, file.id);
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
  const markUp = Bubble.decompile([64, 96], bubble);
  const json = JSON.stringify(markUp);
  await file.write(json);
}

export async function loadBubbleFrom(file: File): Promise<Bubble> {
  const content = await file.read();
  const markUp = JSON.parse(content);
  const bubble = Bubble.compile([64, 96], markUp);
  return bubble;
}