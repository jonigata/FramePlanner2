import { decode, encode } from 'cbor-x'
import { ulid } from 'ulid';
import { createCanvasFromImage } from "../../utils/imageUtil";
import { unpackFrameImages, unpackBubbleImages, packFilms } from "./imagePacking";
import type { Book, Page, WrapMode, ReadingDirection, SerializedPage } from "./book";
import { type Notebook, emptyNotebook } from "./notebook";
import { Bubble } from "../layeredCanvas/dataModels/bubble";
import { FrameElement } from "../layeredCanvas/dataModels/frameTree";

export type EnvelopedBook = {
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  images: { [fileId: string]: Uint8Array }
  notebook: Notebook | null,
};

export type CanvasBag = { [fileId: string]: HTMLCanvasElement };

// TODO: revision.idは受けた側で設定する
export async function readEnvelope(blob: Blob): Promise<Book> {
  console.tag("importEnvelope", "cyan");
  const uint8Array = new Uint8Array(await blob.arrayBuffer());
  const envelopedBook: EnvelopedBook = decode(uint8Array);

  const bag: CanvasBag = {};
  for (const imageId in envelopedBook.images) {
    const blob = new Blob([envelopedBook.images[imageId]], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();
    URL.revokeObjectURL(url);
    const canvas = createCanvasFromImage(image);
    (canvas as any)["envelopeFileId"] = imageId;
    bag[imageId] = canvas;
  }

  const book: Book = {
    revision: { id: 'not visited', revision: 1, prefix: 'envelope-' },
    pages: [],
    history: { entries: [], cursor: 0 },
    direction: envelopedBook.direction,
    wrapMode: envelopedBook.wrapMode,
    chatLogs: [],
    notebook: envelopedBook.notebook ?? emptyNotebook(),
  };

  const getCanvas = async (imageId: string) => bag[imageId];

  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await unpackFrameImages(envelopedPage.paperSize, envelopedPage.frameTree, getCanvas);
    const bubbles = await unpackBubbleImages(envelopedPage.paperSize, envelopedPage.bubbles, getCanvas);
  
    const page: Page = {
      id: envelopedPage.id ?? ulid(),
      frameTree: frameTree,
      bubbles: bubbles,
      paperSize: envelopedPage.paperSize,
      paperColor: envelopedPage.paperColor,
      frameColor: envelopedPage.frameColor,
      frameWidth: envelopedPage.frameWidth,
      source: null,
    }
    book.pages.push(page);    
  }

  return book;
}

export async function writeEnvelope(book: Book): Promise<Blob> {
  const envelopedBook: EnvelopedBook = {
    pages: [],
    direction: book.direction,
    wrapMode: book.wrapMode,
    notebook: book.notebook,
    images: {},
  };
  for (const page of book.pages) {
    const markUp = await putFrameImages(page.frameTree, envelopedBook.images, 'v');
    const bubbles = await putBubbleImages(page.bubbles, envelopedBook.images);
    
    const serializedPage: SerializedPage = {
      id: page.id,
      frameTree: markUp,
      bubbles: bubbles,
      paperSize: page.paperSize,
      paperColor: page.paperColor,
      frameColor: page.frameColor,
      frameWidth: page.frameWidth,
    }
    envelopedBook.pages.push(serializedPage);    
  }

  const encoded = encode(envelopedBook);
  return new Blob([encoded], { type: 'application/cbor' });
}


async function putFrameImages(frameTree: FrameElement, images: { [fileId: string]: Uint8Array }, parentDirection: 'h' | 'v'): Promise<any> {
  const f = async (canvas: HTMLCanvasElement) => {
    const array = await canvasToUint8Array(canvas);
    const fileId = ulid();
    images[fileId] = array;
    return fileId;
  };

  const markUp = FrameElement.decompileNode(frameTree, parentDirection);
  markUp.films = await packFilms(frameTree.filmStack.films, f);

  const children = [];
  for (const child of frameTree.children) {
    children.push(await putFrameImages(child, images, frameTree.direction!));
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

async function putBubbleImages(bubbles: Bubble[], images: { [fileId: string]: Uint8Array }): Promise<any[]> {
  const f = async (canvas: HTMLCanvasElement) => {
    const array = await canvasToUint8Array(canvas);
    const fileId = ulid();
    images[fileId] = array;
    return fileId;
  };

  const packedBubbles = [];
  for (const bubble of bubbles) {
    const markUp = Bubble.decompile(bubble);
    markUp.films = await packFilms(bubble.filmStack.films, f);
    packedBubbles.push(markUp);
  }
  return packedBubbles;
}

async function canvasToUint8Array(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Canvas toBlob failed");
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export type OldEnvelopedBook = {
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  images: { [fileId: string]: string }
  notebook: Notebook | null,
};

export async function readOldEnvelope(json: string): Promise<Book> {
  // この中で作られたimage等はセーブ後捨てられるので、キャッシュなどは一切無視する
  console.tag("importEnvelope", "cyan");
  const envelopedBook: OldEnvelopedBook = JSON.parse(json);

  const bag: CanvasBag = {};
  for (const imageId in envelopedBook.images) {
    const image = new Image();
    image.src = envelopedBook.images[imageId];
    await image.decode();
    bag[imageId] = createCanvasFromImage(image);
  }

  const book: Book = {
    revision: { id: 'not visited', revision: 1, prefix: 'envelope-' },
    pages: [],
    history: { entries: [], cursor: 0 },
    direction: envelopedBook.direction,
    wrapMode: envelopedBook.wrapMode,
    chatLogs: [],
    notebook: envelopedBook.notebook ?? emptyNotebook(),
  };

  const getCanvas = async (imageId: string) => bag[imageId];

  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await unpackFrameImages(envelopedPage.paperSize, envelopedPage.frameTree, getCanvas);
    const bubbles = await unpackBubbleImages(envelopedPage.paperSize, envelopedPage.bubbles, getCanvas);
  
    const page: Page = {
      id: envelopedPage.id ?? ulid(),
      frameTree: frameTree,
      bubbles: bubbles,
      paperSize: envelopedPage.paperSize,
      paperColor: envelopedPage.paperColor,
      frameColor: envelopedPage.frameColor,
      frameWidth: envelopedPage.frameWidth,
      source: null,
    }
    book.pages.push(page);    
  }

  return book;
}
