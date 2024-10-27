import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import type { FileSystem, Folder, NodeId } from "../lib/filesystem/fileSystem";
import { unpackFrameImages, unpackBubbleImages, packFilms } from "../lib/book/imagePacking";

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

export async function fetchFrameImages(paperSize: Vector, markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  const f = (imageId: string) => loadCanvas(fileSystem, imageId);
  return await unpackFrameImages(paperSize, markUp, f);
}

export async function fetchBubbleImages(paperSize: Vector, markUps: any[], fileSystem: FileSystem): Promise<Bubble[]> {
  const f = (imageId: string) => loadCanvas(fileSystem, imageId);
  return await unpackBubbleImages(paperSize, markUps, f);
}

export async function fetchEnvelopedFrameImages(paperSize: Vector, markUp: any, images: { [fileId: string]: HTMLCanvasElement }): Promise<FrameElement> {
  const f = async (imageId: string) => images[imageId];
  return await unpackFrameImages(paperSize, markUp, f);
}

export async function fetchEnvelopedBubbleImages(paperSize: Vector, markUps: any[], images: { [fileId: string]: HTMLCanvasElement }): Promise<Bubble[]> {
  const f = async (imageId: string) => images[imageId];
  return await unpackBubbleImages(paperSize, markUps, f);
}

export async function storeFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  // 画像を別ファイルとして保存して
  // 画像をIDに置き換えたマークアップを返す
  const f = async (canvas: HTMLCanvasElement) => {
    return await saveCanvas(fileSystem, canvas, imageFolder);
  };

  const markUp = FrameElement.decompileNode(frameTree, parentDirection);
  markUp.films = await packFilms(frameTree.filmStack.films, f);

  const children = [];
  for (const child of frameTree.children) {
    children.push(await storeFrameImages(child, fileSystem, imageFolder, frameTree.direction!));
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

export async function storeBubbleImages(bubbles: Bubble[], fileSystem: FileSystem, imageFolder: Folder, paperSize: [number, number]): Promise<any[]> {
  const f = async (canvas: HTMLCanvasElement) => {
    return await saveCanvas(fileSystem, canvas, imageFolder);
  };

  const packedBubbles = [];
  for (const bubble of bubbles) {
    const markUp = Bubble.decompile(bubble);
    markUp.films = await packFilms(bubble.filmStack.films, f);
    packedBubbles.push(markUp);
  }
  return packedBubbles;
}

async function loadCanvas(fs: FileSystem | null, canvasId: string): Promise<HTMLCanvasElement | null> {
  const fileSystem = fs!;
  canvasCache[fileSystem.id] ??= {};

  performance.mark("loadCanvas-start");
  if (canvasCache[fileSystem.id][canvasId]) {
    const canvas = canvasCache[fileSystem.id][canvasId];
    (canvas as any)["clean"][fileSystem.id] = true; // 途中クラッシュでもないと本来はあり得ないが、念のため
    return canvas;
  } else {
    try {
      performance.mark("loadCanvas-read-start");
      const file = (await fileSystem.getNode(canvasId as NodeId))!.asFile()!;
      performance.mark("loadCanvas-read-end");
      performance.measure("loadCanvas-read", "loadCanvas-read-start", "loadCanvas-read-end");

      performance.mark("readCanvas-start");
      const canvas = (await file.readCanvas(false)) as any;
      canvas["fileId"] ??= {}
      canvas["fileId"][fileSystem.id] = file.id
      canvas["clean"] ??= {}
      canvas["clean"][fileSystem.id] = true;
      canvasCache[fileSystem.id][canvasId] = canvas;
      performance.mark("readCanvas-end");
      performance.measure("readCanvas", "readCanvas-start", "readCanvas-end");

      performance.mark("loadCanvas-end");
      performance.measure("loadCanvas", "loadCanvas-start", "loadCanvas-end");
      return canvas;
    }
    catch (e) {
      console.log(e);
      return null;
    }
  }
}

async function saveCanvas(fileSystem: FileSystem, canvas: HTMLCanvasElement, imageFolder: Folder): Promise<NodeId> {
  canvasCache[fileSystem.id] ??= {};
  (canvas as any)["fileId"] ??= {};
  (canvas as any)["clean"] ??= {};

  const fileId = (canvas as any)["fileId"][fileSystem.id];
  if (fileId != null) {
    if (!(canvas as any)["clean"][fileSystem.id]) {
      console.log("************** DIRTY CANVAS");
      const file = (await fileSystem.getNode(fileId))!.asFile()!;
      await file.writeCanvas(canvas);    
      return fileId;
    }
    if (canvasCache[fileSystem.id][fileId]) {
      return fileId;
    }
    // ここには来ないはず
    throw new Error("saveCanvas: fileId is not null but canvas is not in cache");
  }
  const file = await fileSystem.createFile();
  await file.writeCanvas(canvas);
  (canvas as any)["fileId"][fileSystem.id] = file.id;
  (canvas as any)["clean"][fileSystem.id] = true;
  canvasCache[fileSystem.id][file.id] = canvas;
  await imageFolder.link(file.id, file.id);

  return file.id;
}

