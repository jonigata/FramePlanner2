import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import type { FileSystem, Folder, NodeId } from "../lib/filesystem/fileSystem";
import { 
  type MediaType, 
  type MediaResource, 
  type SaveMediaFunc, 
  packFrameMedias, unpackFrameMedias, 
  packBubbleMedias, unpackBubbleMedias,
  packNotebookMedias, unpackNotebookMedias,
} from "../lib/book/imagePacking";
import type { RemoteMediaReference } from "../lib/layeredCanvas/dataModels/media";
import { type NotebookLocal, type SerializedNotebook } from "../lib/book/book";

// キャッシュの仕組み
// 行儀が悪いが、ファイル化済みのオンメモリのcanvas/video/remoteFileRequestオブジェクトには
// mediaResource["fileId"][fileSystemId] = fileId
// というプロパティを追加してある
// このプロパティが存在しない場合、そのファイルシステムではまだファイル化されていない

// ローカルファイルシステムでは基本的に内容で同一性判断をすることはない
// scribbleしたときに上書きするため

// save時にmediaResource["clean"][fileSystemId] = trueする
// scribbleしたときは、mediaResource["clean"]を空にする
// 次にsaveするときにmediaResource["clean"][fileSystemId]がない場合は、更新されたものとしてsaveする
const mediaResourceCache: { 
  [fileSystemId: string]: { 
    [fileId: string]: HTMLCanvasElement | HTMLVideoElement | RemoteMediaReference;
  } 
} = {};

export async function fetchFrameImages(paperSize: Vector, markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  const f = (imageId: string, mediaType: MediaType) => loadMediaResource(fileSystem, imageId as NodeId, mediaType);
  return await unpackFrameMedias(paperSize, markUp, f);
}

export async function fetchBubbleImages(paperSize: Vector, markUps: any[], fileSystem: FileSystem): Promise<Bubble[]> {
  const f = (imageId: string, mediaType: MediaType) => loadMediaResource(fileSystem, imageId as NodeId, mediaType);
  return await unpackBubbleMedias(paperSize, markUps, f);
}

export async function fetchNotebookImages(serializedNotebook: SerializedNotebook, fileSystem: FileSystem): Promise<NotebookLocal> {
  const f = (imageId: string, mediaType: MediaType) => loadMediaResource(fileSystem, imageId as NodeId, mediaType);
  return await unpackNotebookMedias(serializedNotebook, f);
}

export async function storeFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, videoFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  const f: SaveMediaFunc = async (mediaResource: MediaResource, mediaType: MediaType) => {
    return await saveMediaResource(fileSystem, imageFolder, videoFolder, mediaResource, mediaType);
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
  const f: SaveMediaFunc = async (mediaResource: MediaResource, mediaType: MediaType) => {
    return await saveMediaResource(fileSystem, imageFolder, videoFolder, mediaResource, mediaType);
  };
  return await packBubbleMedias(bubbles, f);
}

export async function storeNotebookImages(notebook: NotebookLocal, fileSystem: FileSystem, imageFolder: Folder, videoFolder: Folder): Promise<SerializedNotebook> {
  const f: SaveMediaFunc = async (mediaResource: MediaResource, mediaType: MediaType) => {
    return await saveMediaResource(fileSystem, imageFolder, videoFolder, mediaResource, mediaType);
  };
  return await packNotebookMedias(notebook, f);
}

async function loadMediaResource(fileSystem: FileSystem, mediaResourceId: NodeId, mediaType: MediaType): Promise<MediaResource> {
  mediaResourceCache[fileSystem.id] ??= {};

  if (mediaResourceCache[fileSystem.id][mediaResourceId]) {
    const mediaResource = mediaResourceCache[fileSystem.id][mediaResourceId];
    (mediaResource as any)["clean"][fileSystem.id] = true; // 途中クラッシュでもないと本来はあり得ないが、念のため
    return mediaResource;
  } else {
    try {
      const file = (await fileSystem.getNode(mediaResourceId as NodeId))!.asFile()!;
      const mediaResource = await file.readMediaResource();

      const r: any = mediaResource;
      r["fileId"] = {}
      r["fileId"][fileSystem.id] = file.id
      r["clean"] = {}
      r["clean"][fileSystem.id] = true;
      mediaResourceCache[fileSystem.id][mediaResourceId] = r;

      return mediaResource;
    }
    catch (e) {
      console.error("loadMediaResource: ここでエラーにするとファイルが読めなくなるので仕方なく握りつぶす", e)
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        throw e;
      }
      return null;
    }
  }
}

async function saveMediaResource(fileSystem: FileSystem, imageFolder: Folder, videoFolder: Folder, mediaResource: MediaResource, mediaType: MediaType): Promise<NodeId> {
  if (mediaResource == null) {
    throw new Error("saveCanvas: mediaResource is null (unexpected error)");
  }
  
  const r = mediaResource as any;

  mediaResourceCache[fileSystem.id] ??= {};
  r["fileId"] ??= {};
  r["clean"] ??= {};

  const fileId = r["fileId"][fileSystem.id];
  if (fileId != null) {
    if (!r["clean"][fileSystem.id]) {
      console.log("************** DIRTY MEDIA");
      const file = (await fileSystem.getNode(fileId))!.asFile()!;
      await file.writeMediaResource(r)
      return fileId;
    }
    if (mediaResourceCache[fileSystem.id][fileId]) {
      return fileId;
    }
    // ここには来ないはず
    throw new Error("saveMediaResource: fileId is not null but canvas is not in cache");
  } else {
    const file = await fileSystem.createFile();
    file.writeMediaResource(r);
    r["fileId"][fileSystem.id] = file.id;
    r["clean"][fileSystem.id] = true;
    mediaResourceCache[fileSystem.id][file.id] = mediaResource;
    if (mediaType === "image") {
      await imageFolder.link(file.id, file.id);
    } else if (mediaType === "video") {
      await videoFolder.link(file.id, file.id);
    } else {
      throw new Error("saveMediaResource: unknown mediaType");
    }
    return file.id;
  }
}

