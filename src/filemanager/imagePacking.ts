import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { Film } from "../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../lib/layeredCanvas/dataModels/media";
import { Effect } from "../lib/layeredCanvas/dataModels/effect";

export async function dryUnpackFrameImages(paperSize: Vector, markUp: any, images: string[]): Promise<void> {
  const dryLoadImage = async (imageId: string): Promise<HTMLCanvasElement | null> => {
    images.push(imageId as string);
    return null;
  };

  await unpackFrameImages(paperSize, markUp, dryLoadImage);
}

export async function dryUnpackBubbleImages(paperSize: Vector, markUps: any[], images: string[]): Promise<void> {
  const dryLoadImage = async (imageId: string): Promise<HTMLCanvasElement | null> => {
    images.push(imageId as string);
    return null;
  };

  await unpackBubbleImages(paperSize, markUps, dryLoadImage);
}

export async function unpackFrameImages(paperSize: Vector, markUp: any, loadCanvasFunc: (imageId: string) => Promise<HTMLCanvasElement | null>): Promise<FrameElement> {
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
        const canvas = await loadCanvasFunc(markUp.image);
        if (canvas) {
          const film = newFilm(canvas);
          frameTree.gallery.push(canvas);
          frameTree.filmStack.films.push(film);
        }
      }
      if (markUp.scribble) {
        console.tag("type A.2", "#004400");
        const scribble = await loadCanvasFunc(markUp.scribble);
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
        const image = await loadCanvasFunc(markUp.image.image);
        if (image) {
          const film = newFilm(image);
          frameTree.gallery.push(image);
          frameTree.filmStack.films.push(film);
        }
      }
      if (markUp.image.scribble) {
        console.tag("type B.2", "#004400");
        const scribble = await loadCanvasFunc(markUp.image.scribble);
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

      const films = await unpackFilms(markUp.films, loadCanvasFunc);
      frameTree.filmStack.films.push(...films);
    }
  }

  const children = markUp.column ?? markUp.row;
  if (children) {
    frameTree.direction = markUp.column ? 'v' : 'h';
    frameTree.children = [];
    for (let child of children) {
      frameTree.children.push(await unpackFrameImages(paperSize, child, loadCanvasFunc));
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

export async function unpackBubbleImages(paperSize: Vector, markUps: any[], loadImageFunc: (imageId: string) => Promise<HTMLCanvasElement | null>): Promise<Bubble[]> {
  const unpackedBubbles: Bubble[] = [];
  for (const markUp of markUps) {
    const bubble: Bubble = Bubble.compile(paperSize, markUp);
    const imageMarkUp = markUp.image;
    if (imageMarkUp) {
      const image = await loadImageFunc(imageMarkUp.image);
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
      const films = await unpackFilms(markUp.films, loadImageFunc);
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

export async function packFilms(films: Film[], saveCanvasFunc: (canvas: HTMLCanvasElement) => Promise<string>): Promise<any[]> {
  const packedFilms = [];
  for (const film of films) {
    if (!(film.media instanceof ImageMedia)) { continue; }

    const effects = [];
    for (const effect of film.effects) {
      const markUp = effect.decompile();
      effects.push({ tag: effect.tag, properties: markUp });
    }

    const canvas = film.media.canvas;
    const fileId = await saveCanvasFunc(canvas);

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

export async function unpackFilms(markUp: any, loadImageFunc: (imageId: string) => Promise<HTMLCanvasElement | null>): Promise<Film[]> {
  const films: Film[] = [];
  for (const filmMarkUp of markUp) {
    const image = await loadImageFunc(filmMarkUp.image);
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

