import { encode, decode } from 'cbor-x'
import { ulid } from 'ulid';
import type { WrapMode, ReadingDirection, SerializedPage, SerializedBook } from "../lib/book/book";
import { ImageMedia } from "../lib/layeredCanvas/dataModels/media";
import { createCanvasFromImage } from "../utils/imageUtil";
import { type Notebook, emptyNotebook } from "../lib/book/notebook";
import type { FileSystem, Folder, File } from "../lib/filesystem/fileSystem";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { fetchFrameImages, fetchBubbleImages, storeBubbleImages, storeFrameImages, fetchEnvelopedBubbleImages, fetchEnvelopedFrameImages } from "./fileImages";

export type EnvelopedBook = {
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  images: { [fileId: string]: Uint8Array }
  notebook: Notebook | null,
};

export async function importEnvelope(blob: Blob, fileSystem: FileSystem, file: File): Promise<void> {
  // この中で作られたimage等はセーブ後捨てられるので、キャッシュなどは一切無視する
  console.tag("importEnvelope", "cyan");
  const uint8Array = new Uint8Array(await blob.arrayBuffer());
  const envelopedBook: EnvelopedBook = decode(uint8Array);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const newImages: { [key: string]: HTMLCanvasElement } = {};
  for (const imageId in envelopedBook.images) {
    const blob = new Blob([envelopedBook.images[imageId]], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();
    newImages[imageId] = createCanvasFromImage(image);
  }

  const serializedBook: SerializedBook = {
    revision: { id: file.id, revision: 1, prefix: 'envelope-' },
    pages: [],
    direction: envelopedBook.direction,
    wrapMode: envelopedBook.wrapMode,
    chatLogs: [],
    notebook: envelopedBook.notebook ?? emptyNotebook(),
  };

  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await fetchEnvelopedFrameImages(envelopedPage.paperSize, envelopedPage.frameTree, newImages);
    const bubbles = await fetchEnvelopedBubbleImages(envelopedPage.paperSize, envelopedPage.bubbles, newImages);
    const frameTreeMarkup = await storeFrameImages(frameTree, fileSystem, imageFolder, 'v');
    const bubbleMarkups = await storeBubbleImages(bubbles, fileSystem, imageFolder, envelopedPage.paperSize, );

    const serializedPage: SerializedPage = {
      id: envelopedPage.id ?? ulid(),
      frameTree: frameTreeMarkup,
      bubbles: bubbleMarkups,
      paperSize: envelopedPage.paperSize,
      paperColor: envelopedPage.paperColor,
      frameColor: envelopedPage.frameColor,
      frameWidth: envelopedPage.frameWidth,
    }
    serializedBook.pages.push(serializedPage);    
  }

  const targetJson = JSON.stringify(serializedBook);
  await file.write(targetJson);
}

export async function exportEnvelope(fileSystem: FileSystem, file: File): Promise<Buffer> {
  console.tag("exportEnvelope(CBOR)", "cyan", file.id);
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
      images: {},
      notebook: null,
    }    
  }

  async function canvasToUint8Array(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Canvas toBlob failed");
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async function collectFrameImages(frameTree: FrameElement, canvases: { [fileId: string]: Uint8Array }): Promise<void> {
    for (const film of frameTree.filmStack.films) {
      if (film.media instanceof ImageMedia) {
        console.log("packaging canvas", film.media.canvas);
        const canvas = film.media.canvas;
        console.log((canvas as any)["fileId"]);
        canvases[(canvas as any)["fileId"][fileSystem.id]] = await canvasToUint8Array(canvas);
      }
    }
    for (const child of frameTree.children) {
      await collectFrameImages(child, canvases);
    }
  }

  async function collectBubbleImages(bubbles: Bubble[], canvases: { [fileId: string]: Uint8Array }): Promise<void> {
    for (const bubble of bubbles) {
      for (const film of bubble.filmStack.films) {
        if (film.media instanceof ImageMedia) {
          console.log("packaging canvas", film.media.canvas);
          const canvas = film.media.canvas;
          canvases[(canvas as any)["fileId"][fileSystem.id]] = await canvasToUint8Array(canvas);
        }
      }
    }
  }

  envelopedBook.images = {};
  for (const envelopedPage of envelopedBook.pages) {
    const frameTree = await fetchFrameImages(envelopedPage.paperSize, envelopedPage.frameTree, fileSystem);
    const bubbles = await fetchBubbleImages(envelopedPage.paperSize, envelopedPage.bubbles, fileSystem);

    await collectFrameImages(frameTree, envelopedBook.images);
    await collectBubbleImages(bubbles, envelopedBook.images);
  }

  const encoded = encode(envelopedBook);
  return encoded;
}
