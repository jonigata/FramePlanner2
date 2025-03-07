import { type Vector, type Rect, getRectCenter, rectToCorners, reverse2D, translateRect, computeConstraintedRect } from "../tools/geometry/geometry";
import type { Media } from './media';
import type { Effect } from './effect';
import { ulid } from 'ulid';
import { ImageMedia } from "./media";

export class Film  {
  ulid: string;
  media: Media;
  n_scale: number;
  n_translation: Vector;
  rotation: number; // degree
  reverse: [number, number];
  visible: boolean;
  prompt: string | null;
  effects: Effect[];
  
  selected: boolean; // 揮発性
  matrix: DOMMatrix | undefined; // 揮発性
  index: number | undefined; // 揮発性

  constructor(media: Media) {
    this.ulid = ulid();
    this.media = media;
    this.n_scale = 1;
    this.n_translation = [0, 0];
    this.rotation = 0;
    this.reverse = [1, 1];
    this.visible = true;
    this.prompt = ["1 dog", "1 cat", "1 rabbit", "1 elephant", "1 dolphin", "1 bird"][Math.floor(Math.random() * 6)];
    this.effects = [];
    this.selected = false;
  }

  clone() {
    const f = new Film(this.media);
    f.n_translation = [...this.n_translation];
    f.n_scale = this.n_scale;
    f.rotation = this.rotation;
    f.reverse = [...this.reverse];
    f.visible = this.visible;
    f.prompt = this.prompt;
    f.effects = this.effects.map(e => e.clone());
    return f;
  }

  getPlainRect() {
    const [w, h] = [this.media.naturalWidth, this.media.naturalHeight];
    const rect: Rect = [- w/2, - h/2, w, h];
    return rect;
  }

  // Shifted = Physicalとscaleは一緒だが、translationはコマの中心から相対

  static getShiftedScale(paperSize: Vector, media: Media, n_scale: number): number {
    const imageSize = Math.min(media.naturalWidth, media.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    const scale = pageSize / imageSize
    return n_scale * scale;
  }

  getShiftedScale(paperSize: Vector): number {
    return Film.getShiftedScale(paperSize, this.media, this.n_scale);
  }

  setShiftedScale(paperSize: Vector, scale: number): void {
    const image = this.media;
    const imageSize = Math.min(image.naturalWidth, image.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    this.n_scale = scale / (pageSize / imageSize);
  }

  static getShiftedTranslation(paperSize: Vector, media: Media, n_translation: Vector): Vector {
    const imageSize = Math.min(media.naturalWidth, media.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    const scale = pageSize / imageSize;
    const translation: Vector = [n_translation[0] * scale, n_translation[1] * scale];
    return translation;
  }

  getShiftedTranslation(paperSize: Vector): Vector {
    return Film.getShiftedTranslation(paperSize, this.media, this.n_translation);
  }

  setShiftedTranslation(paperSize: Vector, translation: Vector): void {
    const image = this.media;
    const imageSize = Math.min(image.naturalWidth, image.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    const scale = pageSize / imageSize;
    this.n_translation = [translation[0] / scale, translation[1] / scale];
  }

  static getShiftedRect(paperSize: Vector, media: Media, n_scale: number, n_translation: Vector, rotation: number): Rect {
    const scale = Film.getShiftedScale(paperSize, media, n_scale);
    const translation = Film.getShiftedTranslation(paperSize, media, n_translation);
    const [w, h] = [media.naturalWidth * scale, media.naturalHeight * scale];
    const [x, y] = translation;
    const rect: Rect = [x - w/2, y - h/2, w, h];
    return rect;
  }

  getShiftedRect(paperSize: Vector): Rect {
    return Film.getShiftedRect(paperSize, this.media, this.n_scale, this.n_translation, this.rotation);
  }
  
  makeMatrix(paperSize: Vector): DOMMatrix {
    const scale = this.getShiftedScale(paperSize);
    const translation = this.getShiftedTranslation(paperSize);
    const matrix = new DOMMatrix();
    matrix.translateSelf(translation[0], translation[1]);
    matrix.rotateSelf(-this.rotation);
    matrix.scaleSelf(scale, scale);
    return matrix;
  }

}

export class FilmStack  {
  films: Film[];

  constructor() {
    this.films = [];
  }

  getSelectedFilms(): Film[] {
    return this.films.filter(film => film.selected);
  }

  getOperationTargetFilms(): Film[] {
    const films = this.getSelectedFilms();
    return 0 < films.length ? films : this.films;
  }
}

export class FilmStackTransformer {
  paperSize: Vector;
  films: Film[];
  pivot: Vector;

  constructor(paperSize: Vector, films: Film[]) {
    this.paperSize = paperSize;
    this.films = films;
    films.forEach((film, i) => {
      film.matrix = film.makeMatrix(paperSize);
    });

    this.pivot = [paperSize[0] / 2, paperSize[1] / 2];
    const r = calculateMinimumBoundingRect(paperSize, films);
    if (r != null) {
      this.pivot = getRectCenter(r);
    }
  }

  scale(s: number) {
    const rootMatrix = new DOMMatrix();
    rootMatrix.scaleSelf(s);

    this.films.forEach((film) => {
      const m = rootMatrix.multiply(film.matrix);
      film.setShiftedTranslation(this.paperSize, [m.e, m.f]);
      film.setShiftedScale(this.paperSize, Math.sqrt(m.a * m.a + m.b * m.b));
    });
  }

  rotate(q: number) {
    const rotation = Math.max(-180, Math.min(180, q));
    const rootMatrix = new DOMMatrix();
    rootMatrix.translateSelf(...this.pivot);
    rootMatrix.rotateSelf(-rotation);
    rootMatrix.translateSelf(...reverse2D(this.pivot));

    this.films.forEach((film) => {
      const m = rootMatrix.multiply(film.matrix);
      film.rotation = -Math.atan2(m.b, m.a) * 180 / Math.PI;
      film.setShiftedTranslation(this.paperSize, [m.e, m.f]);
    });
  }
}

export function calculateMinimumBoundingRect(paperSize: Vector, films: Film[]): Rect | null {
  if (films.length === 0) { return null; }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  films.forEach(film => {
    const transformedCorners = transformFilm(paperSize, film);
    transformedCorners.forEach(corner => {
      const [x, y] = corner;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });

  return [ minX, minY, maxX - minX, maxY - minY ];
}

function transformFilm(paperSize: Vector, film: Film): Vector[] {
  const rect: Rect = film.getPlainRect();
  const corners = rectToCorners(rect);

  const matrix = film.makeMatrix(paperSize);
  return corners.map(corner => matrix.transformPoint({x: corner[0], y: corner[1]})).map(p => [p.x, p.y]);
}

export function fitFilms(paperSize: Vector, constraintRect: Rect, films: Film[]): void {
  const constraintCenter = getRectCenter(constraintRect);
  const mergedRect = calculateMinimumBoundingRect(paperSize, films)!;

  const { scale: targetScale, translation: targetTranslation } = computeConstraintedRect(
    translateRect(mergedRect, constraintCenter),
    constraintRect);

  const rootMatrix = new DOMMatrix();
  rootMatrix.scaleSelf(targetScale, targetScale);
  rootMatrix.translateSelf(...targetTranslation);

  films.forEach(film => {
    const m = rootMatrix.multiply(film.makeMatrix(paperSize));
    const scale = Math.sqrt(m.a * m.a + m.b * m.b);
    film.setShiftedScale(paperSize, scale);
    film.setShiftedTranslation(paperSize, [m.e, m.f]);
  });
}

export function insertFilms(paperSize: Vector, constraintRect: Rect, index: number, films: Film[], targetFilms: Film[], gallery: HTMLCanvasElement[]): void {
  const transformer = new FilmStackTransformer(paperSize, films);
  transformer.scale(0.01);
  fitFilms(paperSize, constraintRect, films);

  targetFilms.splice(index, 0, ...films);

  for (const film of films) {     
    const media = film.media;
    if (media instanceof ImageMedia) {
      gallery.push(media.drawSource);
    }
  }
}
