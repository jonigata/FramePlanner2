import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import type { FileSystem, Folder, NodeId, File } from "../lib/filesystem/fileSystem";
import { type MediaType, type MediaResource, packFrameMedias, unpackFrameMedias, packBubbleMedias, unpackBubbleMedias, type SaveMediaFunc } from "../lib/book/imagePacking";

// キャッシュの仕組み
// 行儀が悪いが、ファイル化済みのオンメモリのcanvas/videoオブジェクトには
// mediaResource["fileId"][fileSystemId] = fileId
// というプロパティを追加してある
// このプロパティが存在しない場合、そのファイルシステムではまだファイル化されていない

// ローカルファイルシステムでは基本的に内容で同一性判断をすることはない
// scribbleしたときに上書きするため

// save時にmediaResource["clean"][fileSystemId] = trueする
// scribbleしたときは、mediaResource["clean"]を空にする
// 次にsaveするときにmediaResource["clean"][fileSystemId]がない場合は、更新されたものとしてsaveする
const mediaResourceCache: { [fileSystemId: string]: { [fileId: string]: HTMLCanvasElement | HTMLVideoElement } } = {};

export async function fetchFrameImages(paperSize: Vector, markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  const f = (imageId: string, mediaType: MediaType) => loadMediaResource(fileSystem, imageId as NodeId, mediaType);
  return await unpackFrameMedias(paperSize, markUp, f);
}

export async function fetchBubbleImages(paperSize: Vector, markUps: any[], fileSystem: FileSystem): Promise<Bubble[]> {
  const f = (imageId: string, mediaType: MediaType) => loadMediaResource(fileSystem, imageId as NodeId, mediaType);
  return await unpackBubbleMedias(paperSize, markUps, f);
}

export async function storeFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, videoFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  const f: SaveMediaFunc = async (mediaResource) => {
    return await saveMediaResource(fileSystem, imageFolder, videoFolder, mediaResource);
  };
  const markUp = await packFrameMedias(frameTree, parentDirection, f);

  const children = [];
  for (const child of frameTree.children) {
    children.push(await storeFrameImages(child, fileSystem, imageFolder, videoFolder, frameTree.direction!));
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

export async function storeBubbleImages(bubbles: Bubble[], fileSystem: FileSystem, imageFolder: Folder, videoFolder: Folder, paperSize: [number, number]): Promise<any[]> {
  const f: SaveMediaFunc = async (mediaResource) => {
    return await saveMediaResource(fileSystem, imageFolder, videoFolder, mediaResource);
  };
  return await packBubbleMedias(bubbles, f);
}

async function loadMediaResource(fileSystem: FileSystem, mediaResourceId: NodeId, mediaType: MediaType): Promise<MediaResource> {
  mediaResourceCache[fileSystem.id] ??= {};

  performance.mark("loadCanvas-start");
  if (mediaResourceCache[fileSystem.id][mediaResourceId]) {
    const mediaResource = mediaResourceCache[fileSystem.id][mediaResourceId];
    (mediaResource as any)["clean"][fileSystem.id] = true; // 途中クラッシュでもないと本来はあり得ないが、念のため
    return mediaResource;
  } else {
    try {
      performance.mark("loadCanvas-read-start");
      const file = (await fileSystem.getNode(mediaResourceId as NodeId))!.asFile()!;
      performance.mark("loadCanvas-read-end");
      performance.measure("loadCanvas-read", "loadCanvas-read-start", "loadCanvas-read-end");

      performance.mark("readCanvas-start");
      const mediaResource: any = 
        mediaType === "image" ? await file.readCanvas(false) : await file.readVideo(false);
      mediaResource["fileId"] ??= {}
      mediaResource["fileId"][fileSystem.id] = file.id
      mediaResource["clean"] ??= {}
      mediaResource["clean"][fileSystem.id] = true;
      mediaResourceCache[fileSystem.id][mediaResourceId] = mediaResource;
      performance.mark("readCanvas-end");
      performance.measure("readCanvas", "readCanvas-start", "readCanvas-end");

      performance.mark("loadCanvas-end");
      performance.measure("loadCanvas", "loadCanvas-start", "loadCanvas-end");
      return mediaResource;
    }
    catch (e) {
      console.log(e);
      return null;
    }
  }
}

async function saveMediaResource(fileSystem: FileSystem, imageFolder: Folder, videoFolder: Folder, mediaResource: MediaResource): Promise<NodeId> {
  if (mediaResource == null) {
    throw new Error("saveCanvas: mediaResource is null (unexpected error)");
  }
  
  const mrany = mediaResource as any;
  mediaResourceCache[fileSystem.id] ??= {};
  mrany["fileId"] ??= {};
  mrany["clean"] ??= {};

  async function write(file: File) {
    if (mediaResource instanceof HTMLCanvasElement) {
      await file.writeCanvas(mediaResource);
    } else {
      await file.writeVideo(mediaResource as HTMLVideoElement);
    }
  }

  const fileId = mrany["fileId"][fileSystem.id];
  if (fileId != null) {
    if (!mrany["clean"][fileSystem.id]) {
      console.log("************** DIRTY CANVAS");
      const file = (await fileSystem.getNode(fileId))!.asFile()!;
      await write(file)
      return fileId;
    }
    if (mediaResourceCache[fileSystem.id][fileId]) {
      return fileId;
    }
    // ここには来ないはず
    throw new Error("saveCanvas: fileId is not null but canvas is not in cache");
  }
  const file = await fileSystem.createFile();
  await write(file);
  mrany["fileId"][fileSystem.id] = file.id;
  mrany["clean"][fileSystem.id] = true;
  mediaResourceCache[fileSystem.id][file.id] = mediaResource;
  if (mediaResource instanceof HTMLCanvasElement) {
    await imageFolder.link(file.id, file.id);
  } else {
    await videoFolder.link(file.id, file.id);
  }

  return file.id;
}

