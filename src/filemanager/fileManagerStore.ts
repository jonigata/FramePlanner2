import { writable, type Writable } from "svelte/store";
import type { FileSystem, Folder, File, NodeId, BindId } from "../lib/filesystem/fileSystem.js";
import type { Page, Book, WrapMode, ReadingDirection } from "../bookeditor/book.js";
import { commitBook } from "../bookeditor/book.js";
import { Film, FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { ulid } from 'ulid';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";

export type Dragging = {
  bindId: string;
  parent: string;
}

// TODO: 要らないの混じってると思う
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
export const fileManagerUsedSize: Writable<number> = writable(null);
export const loadToken: Writable<NodeId> = writable(null);

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
  direction: ReadingDirection,
  wrapMode: WrapMode,
}

export async function saveBookTo(book: Book, fileSystem: FileSystem, file: File): Promise<void> {
  console.tag("saveBookTo", "cyan", file.id);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const serializedBook: SerializedBook = {
    revision: book.revision,
    pages: [],
    direction: book.direction,
    wrapMode: book.wrapMode,
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
  const markUp = FrameElement.decompileNode(frameTree, parentDirection);
  for (let film of frameTree.filmStack.films) {
    const image = film.image;
    const scribble = film.scribble;

    let markUpImage = null;
    let markUpScribble = null;
    
    if (image) {
      await saveImage(fileSystem, image, imageFolder);
      const fileId = image["fileId"][fileSystem.id];
      markUpImage = fileId;
    }
    if (scribble) {
      await saveImage(fileSystem, scribble, imageFolder);
      const fileId = scribble["fileId"][fileSystem.id];
      markUpScribble = fileId;
    }

    markUp.image = {
      image: markUpImage,
      scribble: markUpScribble,
<<<<<<< HEAD
      n_scale: film.n_scale,
      n_translation: [...film.n_translation],
      rotation: film.rotation,
      reverse: [...film.reverse],
=======
      n_scale: frameTree.image.n_scale,
      n_translation: [...frameTree.image.n_translation],
      rotation: frameTree.image.rotation,
      reverse: [...frameTree.image.reverse],
>>>>>>> main
    }
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
  for (const bubble of bubbles) {
    const image = bubble.image;
    const markUp = Bubble.decompile(bubble);
    if (image) {
      await saveImage(fileSystem, image.image, imageFolder);
      const fileId = image.image["fileId"][fileSystem.id];
      markUp.image = {
        image: fileId,
        n_scale: bubble.image.n_scale,
        n_translation: bubble.image.n_translation,
        scaleLock: bubble.image.scaleLock,
      };
    }
    packedBubbles.push(markUp);
  }
  return packedBubbles;
}


export async function loadBookFrom(fileSystem: FileSystem, file: File): Promise<Book> {
  console.tag("loadBookFrom", "cyan", file.id);
  const content = await file.read();
  const serializedBook = JSON.parse(content);

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    const serializedPage = serializedBook;
    const frameTree = await unpackFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await unpackBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);
    return await wrapPageAsBook(serializedBook, frameTree, bubbles);
  }

  const book: Book = {
    revision: serializedBook.revision,
    pages: [],
    history: {
      entries: [],
      cursor: 0,
    },
    direction: serializedBook.direction ?? 'right-to-left',
    wrapMode: serializedBook.wrapMode ?? 'none',
  };

  for (const serializedPage of serializedBook.pages) {
    const frameTree = await unpackFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await unpackBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);

    const page: Page = {
      id: serializedPage.id ?? ulid(),
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
    id: serializedPage.id ?? ulid(),
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
    direction: 'right-to-left',
    wrapMode: 'none',
  };
  commitBook(book, null);

  return book;
}

async function unpackFrameImages(paperSize: Vector, markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  const frameTree = FrameElement.compileNode(markUp);

  frameTree.gallery = [];
  if (markUp.image || markUp.scribble) {
    if (typeof markUp.image === 'string') {
      // 旧バージョン処理
      let image = null;
      let scribble = null;
      if (markUp.image) {
        image = await loadImage(fileSystem, markUp.image);
        if (image) {
          frameTree.gallery.push(image);
        }
      }
      if (markUp.scribble) {
        scribble = await loadImage(fileSystem, markUp.scribble);
        if (scribble) {
          frameTree.gallery.push(scribble);
        }
      } 

      const anyImage = image ?? scribble;
      if (anyImage) {
        const s_imageSize = Math.min(anyImage.width, anyImage.height) ;
        const s_pageSize = Math.min(paperSize[0], paperSize[1]);
        const scale = s_imageSize / s_pageSize;

        const markUpScale = (markUp.scale ?? [1,1])[0];
        const n_scale = scale * markUpScale;
        
        const markUpTranlation = markUp.translation ?? [0,0];
        const n_translation: Vector = [markUpTranlation[0] * scale, markUpTranlation[1] * scale];

        const film = new Film();
        film.image = image;
        film.scribble = scribble;
        film.n_scale = n_scale;
        film.n_translation = n_translation;
        film.rotation = markUp.rotation;
        film.reverse = [...(markUp.reverse ?? [1,1])] as Vector;

        frameTree.filmStack.films = [film];
      }
    } else {
      // 新バージョン処理
      let image = null;
      let scribble = null;
      if (markUp.image.image) {
        image = await loadImage(fileSystem, markUp.image.image);
        if (image) {
          frameTree.gallery.push(image);
        }
      }
      if (markUp.scribble) {
        scribble = await loadImage(fileSystem, markUp.image.scribble);
        if (scribble) {
          frameTree.gallery.push(scribble);
        }
      } 

      if (image || scribble) {
        const film = new Film();
        film.image = image;
        film.scribble = scribble;
        film.n_scale = markUp.image.n_scale;
        film.n_translation = markUp.image.n_translation;
        film.rotation = markUp.image.rotation;
        film.reverse = [...markUp.image.reverse] as Vector;
        
        frameTree.filmStack.films = [film];
      }
    }
  }

  const children = markUp.column ?? markUp.row;
  if (children) {
    frameTree.direction = markUp.column ? 'v' : 'h';
    frameTree.children = [];
    for (let child of children) {
      frameTree.children.push(await unpackFrameImages(paperSize, child, fileSystem));
    }
    frameTree.calculateLengthAndBreadth();
  }

  return frameTree;
}

async function unpackBubbleImages(paperSize: Vector, markUps: any[], fileSystem: FileSystem): Promise<Bubble[]> {
  const unpackedBubbles: Bubble[] = [];
  for (const markUp of markUps) {
    const imageMarkUp = markUp.image;
    const bubble: Bubble = Bubble.compile(paperSize, markUp);
    if (imageMarkUp) {
      const image = await loadImage(fileSystem, imageMarkUp.image);
      if (image) {
        const s_imageSize = Math.min(image.width, image.height) ;
        const s_pageSize = Math.min(paperSize[0], paperSize[1]);

        let n_scale = imageMarkUp.n_scale;
        if (!n_scale) {
          const markUpScaleVector = imageMarkUp.scale ?? [1,1];
          const markUpScale = markUpScaleVector[0];
          n_scale = s_imageSize / s_pageSize * markUpScale;
        }
        let n_translation = imageMarkUp.n_translation;
        if (!n_translation) {
          const markUpTranslationVector = imageMarkUp.translation ?? [0,0];
          const scale = s_imageSize / s_pageSize;
          n_translation = [markUpTranslationVector[0] * scale, markUpTranslationVector[1] * scale];
        }
        bubble.image = { 
          image,
          n_scale,
          n_translation,
          scaleLock: imageMarkUp.scaleLock,
        };
      }
    }
    unpackedBubbles.push(bubble);
  }
  return unpackedBubbles;
}

export async function newFile(fs: FileSystem, folder: Folder, name: string, book: Book): Promise<{file: File, bindId: BindId}> {
  const file = await fs.createFile();
  book.revision.id = file.id;

  console.tag("newFile", "cyan");
  await saveBookTo(book, fs, file);
  const bindId = await folder.link(name, file.id);
  return { file, bindId };
}

async function loadImage(fileSystem: FileSystem, imageId: string): Promise<HTMLImageElement> {
  imageCache[fileSystem.id] ??= {};

  if (imageCache[fileSystem.id][imageId]) {
    return imageCache[fileSystem.id][imageId];
  } else {
    try {
      const file = (await fileSystem.getNode(imageId as NodeId)).asFile();
      const image = await file.readImage();
      image["fileId"] ??= {}
      image["fileId"][fileSystem.id] = file.id
      imageCache[fileSystem.id][imageId] = image;
      return image;
    }
    catch (e) {
      console.log(e);
      return null;
    }
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

  const root = await fileSystem.getRoot();
  const imageFolder = await root.getNodeByName('画像') as Folder;

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    serializedBook = {
      pages: [serializedBook],
    }
  }

  for (const serializedPage of serializedBook.pages) {
    const frameTree = dryUnpackFrameImages(serializedPage.frameTree, images);
    const bubbles = dryUnpackBubbleImages(serializedPage.bubbles, images);
  }
}

function dryUnpackFrameImages(markUp: any, images: NodeId[]) {
  const frameTree = FrameElement.compileNode(markUp);

  if (markUp.image) {
    if (typeof markUp.image !== 'string') {
      // throw new Error('invalid image, ' + JSON.stringify(markUp.image)); 
    } 
    images.push(markUp.image);
  }
  if (markUp.scribble) {
    if (typeof markUp.scribble !== 'string') { 
      // throw new Error('invalid scribble' + JSON.stringify(markUp.scribble)); 
    }
    images.push(markUp.scribble);
  }


  const children = markUp.column ?? markUp.row;
  if (children) {
    for (let child of children) {
      dryUnpackFrameImages(child, images);
    }
  }
}

function dryUnpackBubbleImages(bubbles: any[], images: NodeId[]) {
  const unpackedBubbles: Bubble[] = [];
  for (const src of bubbles) {
    const image = src.image;
    if (image) {
      if (typeof image.image !== 'string') { 
        // throw new Error('invalid image' + JSON.stringify(image.image)); 
      }
      images.push(image.image);
    }
  }
}


