import { ulid } from 'ulid';
import type { WrapMode, ReadingDirection } from "../bookeditor/book";
import { ImageMedia } from "../lib/layeredCanvas/dataModels/media";
import { createCanvasFromImage } from "../utils/imageUtil";
import { type SerializedBook, type SerializedPage } from "./fileManagerStore";
import { type Notebook, emptyNotebook } from "../notebook/notebook";
import type { FileSystem, Folder, File } from "../lib/filesystem/fileSystem";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { unpackFrameImages, unpackBubbleImages, packBubbleImages, packFrameImages, unpackEnvelopedBubbleImages, unpackEnvelopedFrameImages } from "./fileImages";

export type EnvelopedBook = {
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  images: { [fileId: string]: string }
  notebook: Notebook | null,
};

export async function importEnvelope(json: string, fileSystem: FileSystem, file: File): Promise<void> {
  // この中で作られたimage等はセーブ後捨てられるので、キャッシュなどは一切無視する
  console.tag("importEnvelope", "cyan");
  const envelopedBook: EnvelopedBook = JSON.parse(json);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const newImages: { [key: string]: HTMLCanvasElement } = {};
  for (const imageId in envelopedBook.images) {
    const image = new Image();
    image.src = envelopedBook.images[imageId];
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
    const frameTree = await unpackEnvelopedFrameImages(envelopedPage.paperSize, envelopedPage.frameTree, newImages);
    const bubbles = await unpackEnvelopedBubbleImages(envelopedPage.paperSize, envelopedPage.bubbles, newImages);
    const frameTreeMarkup = await packFrameImages(frameTree, fileSystem, imageFolder, 'v');
    const bubbleMarkups = await packBubbleImages(bubbles, fileSystem, imageFolder, envelopedPage.paperSize, );

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
      images: {},
      notebook: null,
    }    
  }

  function collectFrameImages(frameTree: FrameElement, canvases: { [fileId: string]: string }) {
    for (const film of frameTree.filmStack.films) {
      if (film.media instanceof ImageMedia) {
        const canvas = film.media.canvas;
        console.log((canvas as any)["fileId"]);
        canvases[(canvas as any)["fileId"][fileSystem.id]] = canvas.toDataURL("image/png");
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
          canvases[(canvas as any)["fileId"][fileSystem.id]] = canvas.toDataURL("image/png");
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
