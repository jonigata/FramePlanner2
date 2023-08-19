import { writable } from "svelte/store";
import type { FileSystem, Folder, File, NodeId } from "./lib/filesystem/fileSystem";
import type { Page, Revision } from "./pageStore";
import { FrameElement } from "./lib/layeredCanvas/frameTree";
import type { Bubble } from "./lib/layeredCanvas/bubble";
import { imageToBase64 } from "./lib/layeredCanvas/saveCanvas";

export const fileManagerOpen = writable(false);
export const fileSystem: FileSystem = null;
export const trashUpdateToken = writable(false);
export const fileManagerRefreshKey = writable(0);
export const fileManagerDragging = writable(null);

type SerializedPage = {
  revision: {id: string, revision: number},
  frameTree: any,
  bubbles: any[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
  desktopPosition?: [number, number],
}

export async function savePageTo(page: Page, fileSystem: FileSystem, file: File): Promise<void> {
  console.log("*********** savePageTo");

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;

  const markUp = await packFrameImages(page.frameTree, fileSystem, imageFolder, 'v');
  const bubbles = await packBubbleImages(page.bubbles, fileSystem, imageFolder);

  const serializedPage: SerializedPage = {
    revision: {id: file.id, revision: page.revision.revision},
    frameTree: markUp,
    bubbles: bubbles,
    paperSize: page.paperSize,
    paperColor: page.paperColor,
    frameColor: page.frameColor,
    frameWidth: page.frameWidth,
    desktopPosition: page.desktopPosition
  }
  const json = JSON.stringify(serializedPage);
  await file.write(json);
}

async function packFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  // 画像を別ファイルとして保存して
  // 画像をIDに置き換えたマークアップを返す
  const image = frameTree.image;
  const markUp = FrameElement.decompileNode(frameTree, parentDirection);

  if (image) {
    if (!image.fileId) {
      const file = await fileSystem.createFile();
      await file.write(imageToBase64(image));
      imageFolder.link(file.id, file);
      image.fileId = file.id;
    }
    markUp.image = image.fileId;
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

async function packBubbleImages(bubbles: Bubble[], fileSystem: FileSystem, imageFolder: Folder): Promise<any[]> {
  const packedBubbles = [];
  for (const bubble of bubbles) {
    const image = bubble.image;
    if (image && !image.fileId) {
      const file = await fileSystem.createFile();
      await file.write(imageToBase64(image));
      imageFolder.link(file.id, file);
      image.fileId = file.id;
    }
    const b = {
      ...bubble,
      image: image ? image.fileId : undefined,
    };
    packedBubbles.push(b);
  }
  return packedBubbles;
}


export async function loadPageFrom(fileSystem: FileSystem, file: File): Promise<Page> {
  console.log("*********** loadPageFrom");
  const content = await file.read();
  const serializedPage = JSON.parse(content);

  const root = await fileSystem.getRoot();
  const imageFolder = await root.getNodeByName('画像') as Folder;

  const frameTree = await unpackFrameImages(serializedPage.frameTree, fileSystem, imageFolder, 'v');
  const bubbles = await unpackBubbleImages(serializedPage.bubbles, fileSystem, imageFolder);

  const page: Page = {
    revision: serializedPage.revision,
    frameTree: frameTree,
    bubbles: bubbles,
    paperSize: serializedPage.paperSize,
    paperColor: serializedPage.paperColor,
    frameColor: serializedPage.frameColor,
    frameWidth: serializedPage.frameWidth,
    desktopPosition: serializedPage.desktopPosition,
  };

  return page;
}

async function unpackFrameImages(markUp: any, fileSystem: FileSystem, imageFolder: Folder, parentDirection: 'h' | 'v'): Promise<FrameElement> {
  const frameTree = FrameElement.compileNode(markUp);

  if (markUp.image) {
    const file = (await fileSystem.getNode(markUp.image as NodeId)).asFile();
    const content = await file.read();
    const image = new Image();
    image.src = content;
    frameTree.image = image;
  }

  const children = markUp.column ?? markUp.row;
  if (children) {
    frameTree.direction = markUp.column ? 'v' : 'h';
    frameTree.children = [];
    for (let child of children) {
      frameTree.children.push(await unpackFrameImages(child, fileSystem, imageFolder, frameTree.direction));
    }
    frameTree.calculateLengthAndBreadth();
  }

  return frameTree;
}

async function unpackBubbleImages(bubbles: any[], fileSystem: FileSystem, imageFolder: Folder): Promise<Bubble[]> {
  const unpackedBubbles: Bubble[] = [];
  for (const bubble of bubbles) {
    const imageId = bubble.image;
    if (imageId) {
      const file = (await fileSystem.getNode(imageId as NodeId)).asFile();
      const content = await file.read();
      const image = new Image();
      image.src = content;
      bubble.image = image;
    }
    unpackedBubbles.push(bubble);
  }
  return unpackedBubbles;
}

