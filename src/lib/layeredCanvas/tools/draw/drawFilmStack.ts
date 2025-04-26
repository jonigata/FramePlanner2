import type { FilmStack, Barriers } from '../../dataModels/film';
import type { Vector } from '../geometry/geometry';
import type { Trapezoid } from '../geometry/trapezoid';
import { clipPolygonByLine } from '../geometry/clipPolygonByLine';

export function drawFilmStack(ctx: CanvasRenderingContext2D, filmStack: FilmStack, paperSize: Vector, center: Vector, clipFrame: Trapezoid | null) {
  const films = filmStack.films;

  for (let film of films) {
    if (!film.visible) { continue; }

    const scale = film.getShiftedScale(paperSize);
    const translation = film.getShiftedTranslation(paperSize);

    ctx.save();
    if (clipFrame) {
      ctx.clip(makeFrameClip(clipFrame, paperSize, film.barriers));
    }
    ctx.translate(...center);
    ctx.translate(translation[0], translation[1]);
    ctx.rotate(-film.rotation * Math.PI / 180);
    ctx.scale(scale * film.reverse[0], scale * film.reverse[1]);

    let media = film.media;
    for (let i = film.effects.length - 1; 0 <= i; i--) {
      if (film.effects[i].outputMedia) {
        media = film.effects[i].outputMedia!;
        break;
      }
    }

    ctx.translate(-media.naturalWidth * 0.5, -media.naturalHeight * 0.5);
    ctx.drawImage(media.drawSource, 0, 0, media.naturalWidth, media.naturalHeight);

    ctx.restore();
  }
}

export function drawFilmStackBorders(ctx: CanvasRenderingContext2D, filmStack: FilmStack, paperSize: Vector) {
  const films = filmStack.films;

  for (let film of films) {
    if (!film.visible) { continue; }

    const scale = film.getShiftedScale(paperSize);
    const translation = film.getShiftedTranslation(paperSize);

    ctx.save();
    ctx.translate(translation[0], translation[1]);
    ctx.rotate(-film.rotation * Math.PI / 180);

    if (film.visible) {
      const sx = scale * film.reverse[0];
      const sy = scale * film.reverse[1];
      const iw = sx * film.media.naturalWidth;
      const ih = sy * film.media.naturalHeight;

      ctx.save();
      ctx.translate(-iw * 0.5, -ih * 0.5);
      ctx.strokeStyle = '#00000080';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, iw, ih);
      ctx.restore();
    }
    ctx.restore();
  }
}

function makeFrameClip(trapezoid: Trapezoid, paperSize: Vector, barriers: Barriers): Path2D {
  const [w, h] = paperSize;
  let polygon: Vector[] = [[0, 0], [w, 0], [w, h], [0, h]];
  if (barriers.top) {
    polygon = clipPolygonByLine(polygon, trapezoid.topLeft, trapezoid.topRight);
  }
  if (barriers.right) {
    polygon = clipPolygonByLine(polygon, trapezoid.topRight, trapezoid.bottomRight);
  }
  if (barriers.bottom) {
    polygon = clipPolygonByLine(polygon, trapezoid.bottomRight, trapezoid.bottomLeft);
  }
  if (barriers.left) {
    polygon = clipPolygonByLine(polygon, trapezoid.bottomLeft, trapezoid.topLeft);
  }

  const path = new Path2D();
  path.moveTo(...polygon[0]);
  for (let i = 1; i < polygon.length; i++) {
    path.lineTo(...polygon[i]);
  }
  path.closePath();
  return path;
}