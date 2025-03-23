import { decode, encode } from 'cbor-x'
import { ulid } from 'ulid';
import { unpackFrameMedias, unpackBubbleMedias, packFrameMedias, packBubbleMedias } from "./imagePacking";
import type { SaveMediaFunc, MediaResource, MediaType } from "./imagePacking";
import type { Book, Page, WrapMode, ReadingDirection, SerializedPage } from "./book";
import { type Notebook, emptyNotebook } from "./types/notebook";
import { Bubble } from "../layeredCanvas/dataModels/bubble";
import { FrameElement } from "../layeredCanvas/dataModels/frameTree";
import { createCanvasFromImage, getFirstFrameOfVideo, canvasToBlob } from "../layeredCanvas/tools/imageUtil";

// 互換性維持のため、imagesは残してmediasを追加する

export type EnvelopedBook = {
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  images?: { [fileId: string]: Uint8Array },
  medias?: { [fileId: string]: { type: MediaType, data: Uint8Array, format?: string } },
  notebook: Notebook | null,
};

export type CanvasBag = { [fileId: string]: { type: MediaType, data: HTMLCanvasElement | HTMLVideoElement } };

export async function readEnvelope(blob: Blob, progress: (n: number) => void): Promise<Book> {
  const uint8Array = new Uint8Array(await blob.arrayBuffer());
  const envelopedBook: EnvelopedBook = decode(uint8Array);

  const bag: CanvasBag = {};
  if (envelopedBook.images) {
    progress(0);
    for (const imageId in envelopedBook.images) {
      const blob = new Blob([envelopedBook.images[imageId]], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      await image.decode();
      URL.revokeObjectURL(url);
      const canvas = createCanvasFromImage(image);
      (canvas as any)["envelopeFileId"] = imageId;
      bag[imageId] = { type: 'image', data: canvas };
      progress(Object.keys(bag).length / Object.keys(envelopedBook.images).length);
    }
  }
  if (envelopedBook.medias) {
    progress(0);
    for (const mediaId in envelopedBook.medias) {
      const media = envelopedBook.medias[mediaId];
      const blob = new Blob(
        [media.data], 
        { 
          type: media.type === 'image' ? `image/${media.format ?? 'png'}` : 'video/mp4' 
        });
      const url = URL.createObjectURL(blob);
      if (media.type === 'image') {
        const image = new Image();
        image.src = url;
        await image.decode();
        URL.revokeObjectURL(url);
        const canvas = createCanvasFromImage(image);
        (canvas as any)["envelopeFileId"] = mediaId;
        bag[mediaId] = { type: 'image', data: canvas };
      } else {
        const video = document.createElement('video');
        video.src = url;
        await getFirstFrameOfVideo(video);
        bag[mediaId] = { type: 'video', data: video };
      }
      progress(Object.keys(bag).length / Object.keys(envelopedBook.medias).length);
    }
  }

  const book: Book = {
    revision: { id: 'not visited', revision: 1, prefix: 'envelope-' },
    pages: [],
    history: { entries: [], cursor: 0 },
    direction: envelopedBook.direction,
    wrapMode: envelopedBook.wrapMode,
    chatLogs: [],
    notebook: envelopedBook.notebook ?? emptyNotebook(),
    attributes: { publishUrl: null },
  };

  const getCanvas = async (imageId: string) => bag[imageId].data;

  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await unpackFrameMedias(envelopedPage.paperSize, envelopedPage.frameTree, getCanvas);
    const bubbles = await unpackBubbleMedias(envelopedPage.paperSize, envelopedPage.bubbles, getCanvas);
  
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

export async function writeEnvelope(book: Book, progress: (n: number) => void): Promise<Blob> {
  const envelopedBook: EnvelopedBook = {
    pages: [],
    direction: book.direction,
    wrapMode: book.wrapMode,
    notebook: book.notebook,
    medias: {},
  };

  for (const page of book.pages) {
    const markUp = await putFrameMedias(page.frameTree, envelopedBook.medias!, 'v');
    const bubbles = await putBubbleMedias(page.bubbles, envelopedBook.medias!);
    
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
    progress(envelopedBook.pages.length / book.pages.length);
  }

  const encoded = encode(envelopedBook);
  return new Blob([encoded], { type: 'application/cbor' });
}


async function putFrameMedias(frameTree: FrameElement, medias: { [fileId: string]: { type: MediaType, data: Uint8Array, format?: string } }, parentDirection: 'h' | 'v'): Promise<any> {
  const f: SaveMediaFunc = async (mediaResource, mediaType) => {
    const array = await mediaResourceToUint8Array(mediaResource, mediaType);
    const fileId = ulid();
    medias[fileId] = { type: mediaType, data: array, format: 'webp' };
    return fileId;
  };

  const markUp = await packFrameMedias(frameTree, parentDirection, f);

  const children = [];
  for (const child of frameTree.children) {
    children.push(await putFrameMedias(child, medias, frameTree.direction!));
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

async function putBubbleMedias(bubbles: Bubble[], images: { [fileId: string]: { type: MediaType, data: Uint8Array } }): Promise<any[]> {
  const f: SaveMediaFunc = async (mediaResource, mediaType) => {
    const array = await mediaResourceToUint8Array(mediaResource, mediaType);
    const fileId = ulid();
    images[fileId] = { type: mediaType, data: array };
    return fileId;
  };
  return await packBubbleMedias(bubbles, f);
}

async function mediaResourceToUint8Array(mediaResource: MediaResource, mediaType: MediaType): Promise<Uint8Array> {
  if (mediaType === 'image') {
    const canvas = mediaResource as HTMLCanvasElement;
    const blob = await canvasToBlob(canvas);
    if (!blob) throw new Error("Canvas toBlob failed");
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else {
    const blob = await fetch((mediaResource as HTMLVideoElement).src).then(res => res.blob());
    return new Uint8Array(await blob.arrayBuffer());
  }
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
  const envelopedBook: OldEnvelopedBook = JSON.parse(json);

  const bag: CanvasBag = {};
  for (const imageId in envelopedBook.images) {
    const image = new Image();
    image.src = envelopedBook.images[imageId];
    await image.decode();
    bag[imageId] = { type: 'image', data: createCanvasFromImage(image) }
  }

  const book: Book = {
    revision: { id: 'not visited', revision: 1, prefix: 'envelope-' },
    pages: [],
    history: { entries: [], cursor: 0 },
    direction: envelopedBook.direction,
    wrapMode: envelopedBook.wrapMode,
    chatLogs: [],
    notebook: envelopedBook.notebook ?? emptyNotebook(),
    attributes: { publishUrl: null },
  };

  const getCanvas = async (imageId: string) => bag[imageId].data;

  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await unpackFrameMedias(envelopedPage.paperSize, envelopedPage.frameTree, getCanvas);
    const bubbles = await unpackBubbleMedias(envelopedPage.paperSize, envelopedPage.bubbles, getCanvas);
  
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
