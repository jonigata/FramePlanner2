import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import type { FileSystem, Folder, NodeId } from "../lib/filesystem/fileSystem.js";
import { Film } from "../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../lib/layeredCanvas/dataModels/media";
import { Effect } from "../lib/layeredCanvas/dataModels/effect";
import { createCanvasFromImage } from "../utils/imageUtil";

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

export async function unpackFrameImages(paperSize: Vector, markUp: any, fileSystem: FileSystem): Promise<FrameElement> {
  return await unpackFrameImagesInternal(paperSize, markUp, fileSystem, loadCanvas);
}

export async function unpackBubbleImages(paperSize: Vector, markUps: any[], fileSystem: FileSystem): Promise<Bubble[]> {
  return await unpackBubbleImagesInternal(paperSize, markUps, fileSystem, loadCanvas);
}

export async function dryUnpackFrameImages(paperSize: Vector, markUp: any, images: NodeId[]): Promise<void> {
  const dryLoadImage = async (fileSystem: FileSystem | null, imageId: string): Promise<HTMLCanvasElement | null> => {
    images.push(imageId as NodeId);
    return null;
  };

  await unpackFrameImagesInternal(paperSize, markUp, null, dryLoadImage);
}

export async function dryUnpackBubbleImages(paperSize: Vector, markUps: any[], images: NodeId[]): Promise<void> {
  const dryLoadImage = async (fileSystem: FileSystem | null, imageId: string): Promise<HTMLCanvasElement | null> => {
    images.push(imageId as NodeId);
    return null;
  };

  await unpackBubbleImagesInternal(paperSize, markUps, null, dryLoadImage);
}

export async function unpackEnvelopedFrameImages(paperSize: Vector, markUp: any, images: { [fileId: string]: HTMLCanvasElement }): Promise<FrameElement> {
  const loadEnvelopedImage = async (fileSystem: FileSystem | null, imageId: string): Promise<HTMLCanvasElement | null> => {
    return images[imageId];
  };

  return await unpackFrameImagesInternal(paperSize, markUp, null, loadEnvelopedImage);
}

export async function unpackEnvelopedBubbleImages(paperSize: Vector, markUps: any[], images: { [fileId: string]: HTMLCanvasElement }): Promise<Bubble[]> {
  const loadEnvelopedImage = async (fileSystem: FileSystem | null, imageId: string): Promise<HTMLCanvasElement | null> => {
    return images[imageId];
  };

  return await unpackBubbleImagesInternal(paperSize, markUps, null, loadEnvelopedImage);
}

async function unpackFrameImagesInternal(paperSize: Vector, markUp: any, fileSystem: FileSystem | null, loadCanvasFunc: (fileSystem: FileSystem | null, imageId: string) => Promise<HTMLCanvasElement | null>): Promise<FrameElement> {
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
    
        const film = new Film(new ImageMedia(anyCanvas));
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
        const film = new Film(new ImageMedia(anyCanvas));
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

  // films内のimageをgalleryに格納
  for (const film of frameTree.filmStack.films) {
    if (film.media instanceof ImageMedia) {
      frameTree.gallery.push(film.media.canvas);
    }
  }

  return frameTree;
}

async function unpackBubbleImagesInternal(paperSize: Vector, markUps: any[], fileSystem: FileSystem | null, loadImageFunc: (fileSystem: FileSystem | null, imageId: string) => Promise<HTMLCanvasElement | null>): Promise<Bubble[]> {
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
        const film = new Film(new ImageMedia(image));
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

  // films内のimageをgalleryに格納
  for (const bubble of unpackedBubbles) {
    for (const film of bubble.filmStack.films) {
      if (film.media instanceof ImageMedia) {
        bubble.gallery.push(film.media.canvas);
      }
    }
  }

  return unpackedBubbles;
}

export async function packFrameImages(frameTree: FrameElement, fileSystem: FileSystem, imageFolder: Folder, parentDirection: 'h' | 'v'): Promise<any> {
  // 画像を別ファイルとして保存して
  // 画像をIDに置き換えたマークアップを返す
  const markUp = FrameElement.decompileNode(frameTree, parentDirection);
  markUp.films = await packFilms(frameTree.filmStack.films, fileSystem, imageFolder);

  const children = [];
  for (const child of frameTree.children) {
    children.push(await packFrameImages(child, fileSystem, imageFolder, frameTree.direction!));
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

export async function packBubbleImages(bubbles: Bubble[], fileSystem: FileSystem, imageFolder: Folder, paperSize: [number, number]): Promise<any[]> {
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

    const effects = [];
    for (const effect of film.effects) {
      const markUp = effect.decompile();
      effects.push({ tag: effect.tag, properties: markUp });
    }

    const canvas = film.media.canvas;
    await saveCanvas(fileSystem, canvas, imageFolder);
    const fileId = (canvas as any)["fileId"][fileSystem.id];

    const filmMarkUp = {
      ulid: film.ulid,
      image: fileId,
      n_scale: film.n_scale,
      n_translation: [...film.n_translation],
      rotation: film.rotation,
      reverse: [...film.reverse],
      visible: film.visible,
      prompt: film.prompt,
      effects
    }
    packedFilms.push(filmMarkUp);
  }
  return packedFilms;
}

async function unpackFilms(paperSize: Vector, markUp: any, fileSystem: FileSystem | null, loadImageFunc: (fileSystem: FileSystem | null, imageId: string) => Promise<HTMLCanvasElement | null>): Promise<Film[]> {
  const films: Film[] = [];
  for (const filmMarkUp of markUp) {
    const image = await loadImageFunc(fileSystem, filmMarkUp.image);
    if (image) {
      const effects = [];
      if (filmMarkUp.effects) {
        for (const effectMarkUp of filmMarkUp.effects) {
          console.log("===============", effectMarkUp);
          const effect = Effect.compile(effectMarkUp);
          effects.push(effect);
        }
      }

      const film = new Film(new ImageMedia(image));
      if (filmMarkUp.ulid) film.ulid = filmMarkUp.ulid;
      film.n_scale = filmMarkUp.n_scale;
      film.n_translation = filmMarkUp.n_translation;
      film.rotation = filmMarkUp.rotation;
      film.reverse = filmMarkUp.reverse;
      film.visible = filmMarkUp.visible;
      film.prompt = filmMarkUp.prompt;
      film.effects = effects;
      films.push(film);
    }
  }
  return films;
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
      const canvas = (await file.readCanvas()) as any;
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

async function saveCanvas(fileSystem: FileSystem, canvas: HTMLCanvasElement, imageFolder: Folder): Promise<void> {
  canvasCache[fileSystem.id] ??= {};
  (canvas as any)["fileId"] ??= {};
  (canvas as any)["clean"] ??= {};

  const fileId = (canvas as any)["fileId"][fileSystem.id];
  if (fileId != null) {
    if (!(canvas as any)["clean"][fileSystem.id]) {
      console.log("************** DIRTY CANVAS");
      const file = (await fileSystem.getNode(fileId))!.asFile()!;
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
  (canvas as any)["fileId"][fileSystem.id] = file.id;
  (canvas as any)["clean"][fileSystem.id] = true;
  canvasCache[fileSystem.id][file.id] = canvas;
  await imageFolder.link(file.id, file.id);
}

