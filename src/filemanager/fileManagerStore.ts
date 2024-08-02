import { writable, type Writable } from "svelte/store";
import type { FileSystem, Folder, File, NodeId, BindId } from "../lib/filesystem/fileSystem.js";
import type { Page, Book, WrapMode, ReadingDirection, Prefix } from "../bookeditor/book.js";
import { commitBook } from "../bookeditor/book.js";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Film } from "../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../lib/layeredCanvas/dataModels/media";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { ulid } from 'ulid';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import type { ProtocolChatLog } from "../utils/richChat";
import { protocolChatLogToRichChatLog, richChatLogToProtocolChatLog } from "../utils/richChat";
import { imageToBase64 } from "../lib/layeredCanvas/tools/saveCanvas.js";
import { createCanvasFromImage } from "../utils/imageUtil.js";

// キャッシュの仕組み
// 行儀が悪いが、ファイル化済みのオンメモリのcanvasオブジェクトには
// canvas["fileId"][fileSystemId] = fileId
// というプロパティを追加してある
// これがcanvasCache[fileSystemId]から検索する
// このプロパティが存在しない場合、そのファイルシステムではまだファイル化されていない

// ローカルファイルシステムでは基本的に内容で同一性判断をすることはない
// scribbleしたときに上書きするため

// save時にcanvas["clean"][fileSystemId] = trueする
// scribbleしたときは、canvas["clean"]を空にする
// 次にsaveするときにcanvas["clean"][fileSystemId]がない場合は、更新されたものとしてsaveする
const canvasCache: { [fileSystemId: string]: { [fileId: string]: HTMLCanvasElement } } = {};

export type Dragging = {
  bindId: string;
  parent: string;
}

// TODO: 要らないの混じってると思う
export const fileManagerOpen = writable(false);
export const trashUpdateToken = writable(false);
export const fileManagerRefreshKey = writable(0);
export const fileManagerDragging: Writable<Dragging> = writable(null);
export const newBookToken: Writable<Book> = writable(null);
export const saveBubbleToken: Writable<Bubble> = writable(null);
export const fileSystem: Writable<FileSystem> = writable(null);
export const shareBookToken: Writable<Book> = writable(null);
export const fileManagerUsedSize: Writable<number> = writable(null);
export const loadToken: Writable<NodeId> = writable(null);
export const fileManagerMarkedFlag = writable(false);

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
  revision: {id: string, revision: number, prefix: Prefix},
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  chatLogs: ProtocolChatLog[],
}

type EnvelopedBook = {
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  images: { [fileId: string]: string }
};

export async function saveBookTo(book: Book, fileSystem: FileSystem, file: File): Promise<void> {
  console.tag("saveBookTo", "cyan", file.id);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const serializedBook: SerializedBook = {
    revision: book.revision,
    pages: [],
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: richChatLogToProtocolChatLog(book.chatLogs),
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

export function serializeBook(book: Book): SerializedBook {
  return {
    revision: book.revision,
    pages: book.pages.map(page => serializePage(page)),
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: richChatLogToProtocolChatLog(book.chatLogs),
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

async function packFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  // 画像を別ファイルとして保存して
  // 画像をIDに置き換えたマークアップを返す
  const markUp = FrameElement.decompileNode(frameTree, parentDirection);
  markUp.films = await packFilms(frameTree.filmStack.films, fileSystem, imageFolder);

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
    const markUp = Bubble.decompile(bubble);
    markUp.films = await packFilms(bubble.filmStack.films, fileSystem, imageFolder);
    packedBubbles.push(markUp);
  }
  return packedBubbles;
}

async function packFilms(films: Film[], fileSystem: FileSystem, imageFolder: Folder): Promise<any[]> {
  const packedFilms = [];
  for (const film of films) {
    if (!(film.media instanceof ImageMedia)) { continue; }
    const canvas = film.media.canvas;
    await saveCanvas(fileSystem, canvas, imageFolder);
    const fileId = canvas["fileId"][fileSystem.id];

    const filmMarkUp = {
      ulid: film.ulid,
      image: fileId,
      n_scale: film.n_scale,
      n_translation: [...film.n_translation],
      rotation: film.rotation,
      reverse: [...film.reverse],
      visible: film.visible,
      prompt: film.prompt,
    }
    packedFilms.push(filmMarkUp);
  }
  return packedFilms;
}


export async function loadBookFrom(fileSystem: FileSystem, file: File): Promise<Book> {
  console.tag("loadBookFrom", "cyan", file.id);
  const content = await file.read();
  const serializedBook: SerializedBook = JSON.parse(content);

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    const serializedPage = serializedBook as any as SerializedPage;
    const frameTree = await unpackFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await unpackBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);
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
    chatLogs: [],
  };
  commitBook(book, null);

  return book;
}

async function unpackFrameImages(paperSize: Vector, markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  return await unpackFrameImagesInternal(paperSize, markUp, fileSystem, loadCanvas);
}

async function unpackBubbleImages(paperSize: Vector, markUps: any[], fileSystem: FileSystem): Promise<Bubble[]> {
  return await unpackBubbleImagesInternal(paperSize, markUps, fileSystem, loadCanvas);
}

export async function newFile(fs: FileSystem, folder: Folder, name: string, book: Book): Promise<{file: File, bindId: BindId}> {
  const file = await fs.createFile();
  book.revision.id = file.id;

  console.tag("newFile", "cyan");
  await saveBookTo(book, fs, file);
  const bindId = await folder.link(name, file.id);
  return { file, bindId };
}

async function loadCanvas(fileSystem: FileSystem, canvasId: string): Promise<HTMLCanvasElement> {
  canvasCache[fileSystem.id] ??= {};

  if (canvasCache[fileSystem.id][canvasId]) {
    const canvas = canvasCache[fileSystem.id][canvasId];
    canvas["clean"][fileSystem.id] = true; // 途中クラッシュでもないと本来はあり得ないが、念のため
    return canvas;
  } else {
    try {
      const file = (await fileSystem.getNode(canvasId as NodeId)).asFile();
      const canvas = await file.readCanvas();
      canvas["fileId"] ??= {}
      canvas["fileId"][fileSystem.id] = file.id
      canvas["clean"] ??= {}
      canvas["clean"][fileSystem.id] = true;
      canvasCache[fileSystem.id][canvasId] = canvas;
      return canvas;
    }
    catch (e) {
      console.log(e);
      return null;
    }
  }
}

async function saveCanvas(fileSystem: FileSystem, canvas: HTMLCanvasElement, imageFolder: Folder): Promise<void> {
  canvasCache[fileSystem.id] ??= {};
  canvas["fileId"] ??= {}
  canvas["clean"] ??= {}

  const fileId = canvas["fileId"][fileSystem.id];
  if (fileId != null) {
    if (!canvas["clean"][fileSystem.id]) {
      console.log("************** DIRTY CANVAS");
      const file = (await fileSystem.getNode(fileId)).asFile();
      await file.writeCanvas(canvas);    
      return;
    }
    if (canvasCache[fileSystem.id][fileId]) {
      return;
    }
    // ここには来ないはず
    throw new Error("saveCanvas: fileId is not null but canvas is not in cache");
  }
  const file = await fileSystem.createFile();
  await file.writeCanvas(canvas);
  canvas["fileId"][fileSystem.id] = file.id
  canvas["clean"][fileSystem.id] = true;
  canvasCache[fileSystem.id][file.id] = canvas;
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

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    serializedBook = {
      pages: [serializedBook],
    }
  }

  for (const serializedPage of serializedBook.pages) {
    await dryUnpackFrameImages(serializedPage.paperSize, serializedPage.frameTree, images);
    await dryUnpackBubbleImages(serializedPage.paperSize, serializedPage.bubbles, images);
  }
}

async function dryUnpackFrameImages(paperSize: Vector, markUp: any, images: NodeId[]): Promise<void> {
  await unpackFrameImagesInternal(
    paperSize, 
    markUp, 
    null, 
    async (fileSystem: FileSystem, imageId: NodeId) => {
      images.push(imageId);
      return null;
    }
  );
}

async function dryUnpackBubbleImages(paperSize: Vector, markUps: any[], images: NodeId[]): Promise<void> {
  await unpackBubbleImagesInternal(
    paperSize, markUps, null, 
    async (fileSystem: FileSystem, imageId: NodeId) => {
      images.push(imageId);
      return null;
    });
}

async function unpackFrameImagesInternal(paperSize: Vector, markUp: any, fileSystem: FileSystem, loadCanvasFunc: (fileSystem: FileSystem, imageId: string) => Promise<HTMLCanvasElement>): Promise<FrameElement> {
  const frameTree = FrameElement.compileNode(markUp);

  frameTree.gallery = [];
  if (markUp.image || markUp.scribble) {
    if (typeof markUp.image === 'string' || typeof markUp.scribble === 'string') {
      function newFilm(anyCanvas: HTMLCanvasElement): Film {
        const s_imageSize = Math.min(anyCanvas.width, anyCanvas.height) ;
        const s_pageSize = Math.min(paperSize[0], paperSize[1]);
        const scale = s_imageSize / s_pageSize;
    
        const markUpScale = (markUp.scale ?? [1,1])[0];
        const n_scale = scale * markUpScale;
        
        const markUpTranlation = markUp.translation ?? [0,0];
        const n_translation: Vector = [markUpTranlation[0] * scale, markUpTranlation[1] * scale];
    
        const film = new Film();
        film.media = new ImageMedia(anyCanvas);
        film.n_scale = n_scale;
        film.n_translation = n_translation;
        film.rotation = markUp.rotation;
        film.reverse = [...(markUp.reverse ?? [1,1])] as Vector;
        film.prompt = markUp.prompt;
        return film;
      }

      // 初期バージョン処理
      if (markUp.image) {
        console.tag("type A.1", "#004400");
        const canvas = await loadCanvasFunc(fileSystem, markUp.image);
        if (canvas) {
          const film = newFilm(canvas);
          frameTree.gallery.push(canvas);
          frameTree.filmStack.films.push(film);
        }
      }
      if (markUp.scribble) {
        console.tag("type A.2", "#004400");
        const scribble = await loadCanvasFunc(fileSystem, markUp.scribble);
        if (scribble) {
          const film = newFilm(scribble);
          frameTree.gallery.push(scribble);
          frameTree.filmStack.films.push(film);
        }
      } 
    } else {
      // 前期バージョン処理
      function newFilm(anyCanvas: HTMLCanvasElement): Film {
        const film = new Film();
        film.media = new ImageMedia(anyCanvas);
        film.n_scale = markUp.image.n_scale;
        film.n_translation = markUp.image.n_translation;
        film.rotation = markUp.image.rotation;
        film.reverse = [...markUp.image.reverse] as Vector;
        film.prompt = markUp.prompt;
        return film;
      }

      if (markUp.image.image) {
        console.tag("type B.1", "#004400");
        const image = await loadCanvasFunc(fileSystem, markUp.image.image);
        if (image) {
          const film = newFilm(image);
          frameTree.gallery.push(image);
          frameTree.filmStack.films.push(film);
        }
      }
      if (markUp.image.scribble) {
        console.tag("type B.2", "#004400");
        const scribble = await loadCanvasFunc(fileSystem, markUp.image.scribble);
        if (scribble) {
          const film = newFilm(scribble);
          frameTree.gallery.push(scribble);
          frameTree.filmStack.films.push(film);
        }
      } 
    }
  } else {
    // Film版処理
    if (markUp.films) {
      if (0 < markUp.films.length) {
        console.tag("type C", "#004400");
      }

      const films = await unpackFilms(paperSize, markUp.films, fileSystem, loadCanvasFunc);
      frameTree.filmStack.films.push(...films);
    }
  }

  const children = markUp.column ?? markUp.row;
  if (children) {
    frameTree.direction = markUp.column ? 'v' : 'h';
    frameTree.children = [];
    for (let child of children) {
      frameTree.children.push(await unpackFrameImagesInternal(paperSize, child, fileSystem, loadCanvasFunc));
    }
    frameTree.calculateLengthAndBreadth();
  }

  return frameTree;
}

async function unpackBubbleImagesInternal(paperSize: Vector, markUps: any[], fileSystem: FileSystem, loadImageFunc: (fileSystem: FileSystem, imageId: string) => Promise<HTMLCanvasElement>): Promise<Bubble[]> {
  const unpackedBubbles: Bubble[] = [];
  for (const markUp of markUps) {
    const bubble: Bubble = Bubble.compile(paperSize, markUp);
    const imageMarkUp = markUp.image;
    if (imageMarkUp) {
      const image = await loadImageFunc(fileSystem, imageMarkUp.image);
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
        const film = new Film();
        film.media = new ImageMedia(image);
        film.n_scale = n_scale;
        film.n_translation = n_translation;
        bubble.filmStack.films.push(film);
        bubble.scaleLock = imageMarkUp.scaleLock;
      }
    } else if (markUp.films) {
      const films = await unpackFilms(paperSize, markUp.films, fileSystem, loadImageFunc);
      bubble.filmStack.films = films;
    }
    unpackedBubbles.push(bubble);
  }
  return unpackedBubbles;
}

async function unpackFilms(paperSize: Vector, markUp: any, fileSystem: FileSystem, loadImageFunc: (fileSystem: FileSystem, imageId: string) => Promise<HTMLCanvasElement>): Promise<Film[]> {
  const films: Film[] = [];
  for (const filmMarkUp of markUp) {
    const image = await loadImageFunc(fileSystem, filmMarkUp.image);
    if (image) {
      const film = new Film();
      if (filmMarkUp.ulid) film.ulid = filmMarkUp.ulid;
      film.media = new ImageMedia(image);
      film.n_scale = filmMarkUp.n_scale;
      film.n_translation = filmMarkUp.n_translation;
      film.rotation = filmMarkUp.rotation;
      film.reverse = filmMarkUp.reverse;
      film.visible = filmMarkUp.visible;
      film.prompt = filmMarkUp.prompt;
      films.push(film);
    }
  }
  return films;
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
  const nodeId = (await materialFolder.getEntry(materialBindId))[2];
  await materialFolder.unlink(materialBindId);
  await fileSystem.destroyNode(nodeId);
}

export async function exportEnvelope(fileSystem: FileSystem, file: File): Promise<string> {
  console.tag("exportEnvelope", "cyan", file.id);
  const content = await file.read();
  let envelopedBook: EnvelopedBook = JSON.parse(content);

  if (!envelopedBook.pages) {
    const oldSerializedPage = envelopedBook as any;
    const newSerializedPage = {
      id: oldSerializedPage.id ?? ulid(),
      frameTree: oldSerializedPage.frameTree,
      bubbles: oldSerializedPage.bubbles,
      paperSize: oldSerializedPage.paperSize,
      paperColor: oldSerializedPage.paperColor,
      frameColor: oldSerializedPage.frameColor,
      frameWidth: oldSerializedPage.frameWidth,
    }
    envelopedBook = {
      pages: [newSerializedPage],
      direction: 'right-to-left',
      wrapMode: 'none',
      images: {}
    }    
  }

  function collectFrameImages(frameTree: FrameElement, canvases: { [fileId: string]: string }) {
    for (const film of frameTree.filmStack.films) {
      if (film.media instanceof ImageMedia) {
        const canvas = film.media.canvas;
        console.log(canvas["fileId"]);
        canvases[canvas["fileId"][fileSystem.id]] = canvas.toDataURL("image/png");
      }
    }
    for (const child of frameTree.children) {
      collectFrameImages(child, canvases);
    }
  }

  function collectBubbleImages(bubbles: Bubble[], canvases: { [fileId: string]: string }) {
    for (const bubble of bubbles) {
      for (const film of bubble.filmStack.films) {
        if (film.media instanceof ImageMedia) {
          const canvas = film.media.canvas;
          canvases[canvas["fileId"][fileSystem.id]] = canvas.toDataURL("image/png");
        }
      }
    }
  }

  envelopedBook.images = {};
  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await unpackFrameImages(envelopedPage.paperSize, envelopedPage.frameTree, fileSystem);
    const bubbles = await unpackBubbleImages(envelopedPage.paperSize, envelopedPage.bubbles, fileSystem);

    collectFrameImages(frameTree, envelopedBook.images);
    collectBubbleImages(bubbles, envelopedBook.images);
  }

  const json = JSON.stringify(envelopedBook);
  return json;
}

export async function importEnvelope(json: string, fileSystem: FileSystem, file: File): Promise<void> {
  // この中で作られたimage等はセーブ後捨てられるので、キャッシュなどは一切無視する
  console.tag("importEnvelope", "cyan");
  const envelopedBook: EnvelopedBook = JSON.parse(json);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const book: Book = {
    revision: { id: file.id, revision: 1, prefix: 'envelope-' },
    pages: [],
    history: {
      entries: [],
      cursor: 0,
    },
    direction: envelopedBook.direction,
    wrapMode: envelopedBook.wrapMode,
    chatLogs: []
  };

  // envelopeに含まれるimage.fileIdがexport filesystem/import filesystemで被らないことが前提になっている
  // ulidを使っているので、善意に基づけばこれは守られるが、jsonに悪意がある場合は成立しない
  // したがって、newImages[source-image.fileId] = target-file.id として対応表を作り、
  // envelope内のimage参照をtarget file.idに書き換える
  const newImages = {};
  for (const imageId in envelopedBook.images) {
    const image = new Image();
    image.src = envelopedBook.images[imageId];
    await image.decode();

    const file = await fileSystem.createFile();
    await file.writeCanvas(createCanvasFromImage(image));
    await imageFolder.link(file.id, file.id);
    newImages[imageId] = file.id;
  }

  async function loadImage(fileSystem: FileSystem, sourceFileId: string): Promise<HTMLCanvasElement> {
    const targetFileId = newImages[sourceFileId];
    try {
      const file = (await fileSystem.getNode(targetFileId as NodeId)).asFile();
      const canvas = await file.readCanvas();
      return canvas;
    }
    catch (e) {
      console.log(e);
      return null;
    }
  }
  
  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await unpackFrameImagesInternal(envelopedPage.paperSize, envelopedPage.frameTree, fileSystem, loadImage);
    const bubbles = await unpackBubbleImagesInternal(envelopedPage.paperSize, envelopedPage.bubbles, fileSystem, loadImage);

    const page: Page = {
      id: envelopedPage.id ?? ulid(),
      frameTree: frameTree,
      bubbles: bubbles,
      paperSize: envelopedPage.paperSize,
      paperColor: envelopedPage.paperColor,
      frameColor: envelopedPage.frameColor,
      frameWidth: envelopedPage.frameWidth,
    };
    book.pages.push(page);
  }

  await saveBookTo(book, fileSystem, file);
}