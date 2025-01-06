import type { Vector } from "../layeredCanvas/tools/geometry/geometry";
import { FrameElement } from "../layeredCanvas/dataModels/frameTree";
import { Bubble } from "../layeredCanvas/dataModels/bubble";
import { Film } from "../layeredCanvas/dataModels/film";
import { ImageMedia, VideoMedia } from "../layeredCanvas/dataModels/media";
import { Effect } from "../layeredCanvas/dataModels/effect";

export type MediaType = 'image' | 'video';

interface FilmMarkUp {
  ulid: string;
  mediaType?: MediaType;
  image: string;
  n_scale: number;
  n_translation: Vector;
  rotation: number;
  reverse: Vector;
  visible: boolean;
  prompt: string | null;
  effects: any[];
}

export type MediaResource = HTMLCanvasElement | HTMLVideoElement | null;
export type LoadMediaFunc = (imageId: string, mediaType: MediaType) => Promise<MediaResource>;
export type SaveMediaFunc = (mediaResource: MediaResource, mediaType: MediaType) => Promise<string>;
  
export async function dryUnpackFrameMedias(paperSize: Vector, markUp: any, loadedImageList: string[]): Promise<void> {
  const dryLoadMediaResource: LoadMediaFunc = async (imageId: string): Promise<MediaResource> => {
    loadedImageList.push(imageId);
    return null;
  };

  await unpackFrameMedias(paperSize, markUp, dryLoadMediaResource);
}

export async function dryUnpackBubbleMedias(paperSize: Vector, markUps: any[], loadedImageList: string[]): Promise<void> {
  const dryLoadMediaResource: LoadMediaFunc = async (imageId: string): Promise<MediaResource> => {
    loadedImageList.push(imageId);
    return null;
  };

  await unpackBubbleMedias(paperSize, markUps, dryLoadMediaResource);
}

export async function packFrameMedias(frameTree: FrameElement, parentDirection: 'h' | 'v', saveMediaFunc: SaveMediaFunc): Promise<any> {
  const markUp = FrameElement.decompileNode(frameTree, parentDirection);
  markUp.films = await packFilms(frameTree.filmStack.films, saveMediaFunc);
  return markUp;
}

export async function unpackFrameMedias(paperSize: Vector, markUp: any, loadMediaFunc: LoadMediaFunc): Promise<FrameElement> {
  const frameTree = FrameElement.compileNode(markUp);

  frameTree.gallery = [];
  if (markUp.image || markUp.scribble) {
    if (typeof markUp.image === 'string' || typeof markUp.scribble === 'string') {
      // 旧バージョンはvideoに対応していない
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
        const canvas = await loadMediaFunc(markUp.image, 'image');
        if (canvas) {
          const film = newFilm(canvas as HTMLCanvasElement);
          frameTree.filmStack.films.push(film);
        }
      }
      if (markUp.scribble) {
        const scribble = await loadMediaFunc(markUp.scribble, 'image');
        if (scribble) {
          const film = newFilm(scribble as HTMLCanvasElement);
          frameTree.filmStack.films.push(film);
        }
      } 
    } else {
      // 前期バージョン処理(このときVideoMediaはない)
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
        const image = await loadMediaFunc(markUp.image.image, 'image');
        if (image) {
          const film = newFilm(image as HTMLCanvasElement);
          frameTree.filmStack.films.push(film);
        }
      }
      if (markUp.image.scribble) {
        const scribble = await loadMediaFunc(markUp.image.scribble, 'image');
        if (scribble) {
          const film = newFilm(scribble as HTMLCanvasElement);
          frameTree.filmStack.films.push(film);
        }
      } 
    }
  } else {
    // Film版処理
    if (markUp.films) {
      const films = await unpackFilms(markUp.films, loadMediaFunc);
      frameTree.filmStack.films.push(...films);
    }
  }

  const children = markUp.column ?? markUp.row;
  if (children) {
    frameTree.direction = markUp.column ? 'v' : 'h';
    frameTree.children = [];
    for (let child of children) {
      frameTree.children.push(await unpackFrameMedias(paperSize, child, loadMediaFunc));
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

export async function packBubbleMedias(bubbles: Bubble[], saveMediaFunc: SaveMediaFunc): Promise<any[]> {
  const packedBubbles = [];
  for (const bubble of bubbles) {
    const markUp = Bubble.decompile(bubble);
    markUp.films = await packFilms(bubble.filmStack.films, saveMediaFunc);
    packedBubbles.push(markUp);
  }
  return packedBubbles;
}


export async function unpackBubbleMedias(paperSize: Vector, markUps: any[], LoadMediaFunc: LoadMediaFunc): Promise<Bubble[]> {
  const unpackedBubbles: Bubble[] = [];
  for (const markUp of markUps) {
    const bubble: Bubble = Bubble.compile(paperSize, markUp);
    const imageMarkUp = markUp.image;
    if (imageMarkUp) {
      // 旧バージョンはvideoに対応していない
      const mediaResource = await LoadMediaFunc(imageMarkUp.image, 'image');
      if (mediaResource) {
        const s_imageSize = Math.min(mediaResource.width, mediaResource.height) ;
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
        const film = new Film(new ImageMedia(mediaResource　as HTMLCanvasElement));
        film.n_scale = n_scale;
        film.n_translation = n_translation;
        bubble.filmStack.films.push(film);
        bubble.scaleLock = imageMarkUp.scaleLock;
      }
    } else if (markUp.films) {
      const films = await unpackFilms(markUp.films, LoadMediaFunc);
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

export async function packFilms(films: Film[], saveMediaFunc: SaveMediaFunc): Promise<any[]> {
  const packedFilms = [];
  for (const film of films) {
    const effects = [];
    for (const effect of film.effects) {
      const markUp = effect.decompile();
      effects.push({ tag: effect.tag, properties: markUp });
    }

    const fileId = await saveMediaFunc(film.media.drawSource, film.media.type);

    const filmMarkUp = {
      ulid: film.ulid,
      mediaType: film.media.type,
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

export async function unpackFilms(markUp: any, loadMediaFunc: LoadMediaFunc): Promise<Film[]> {
  const films: Film[] = [];
  for (const filmMarkUp of markUp) {
    const mediaResource = await loadMediaFunc(filmMarkUp.image, filmMarkUp.mediaType ?? 'image');
    if (!mediaResource) { continue; }

    const effects = [];
    if (filmMarkUp.effects) {
      for (const effectMarkUp of filmMarkUp.effects) {
        const effect = Effect.compile(effectMarkUp);
        effects.push(effect);
      }
    }

    console.log("MediaType", filmMarkUp.mediaType);

    const media = 
      filmMarkUp.mediaType === 'video' ? // 古いデータはundefined
      new VideoMedia(mediaResource as HTMLVideoElement) : 
      new ImageMedia(mediaResource as HTMLCanvasElement);

    const film = new Film(media);
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
  return films;
}

