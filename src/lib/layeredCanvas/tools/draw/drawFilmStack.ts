import type { FilmStack } from '../../dataModels/film';
import type { Vector } from '../geometry/geometry';

export function drawFilmStack(ctx: CanvasRenderingContext2D, filmStack: FilmStack, paperSize: Vector) {
  const films = filmStack.films;

  for (let film of films) {
    if (!film.visible) { continue; }

    const scale = film.getShiftedScale(paperSize);
    const translation = film.getShiftedTranslation(paperSize);

    ctx.save();
    ctx.translate(translation[0], translation[1]);
    ctx.rotate(-film.rotation * Math.PI / 180);
    ctx.scale(scale * film.reverse[0], scale * film.reverse[1]);

    if (film.visible) {
      ctx.save();
      ctx.translate(-film.media.naturalWidth * 0.5, -film.media.naturalHeight * 0.5);
      ctx.drawImage(film.media.drawSource, 0, 0, film.media.naturalWidth, film.media.naturalHeight);
      ctx.restore();
    }
    ctx.restore();
  }
}

export function drawFilmStackFrame(ctx: CanvasRenderingContext2D, filmStack: FilmStack, paperSize: Vector) {
  const films = filmStack.films;

  for (let film of films) {
    if (!film.visible) { continue; }

    const scale = film.getShiftedScale(paperSize);
    const translation = film.getShiftedTranslation(paperSize);

    ctx.save();
    ctx.translate(translation[0], translation[1]);
    ctx.rotate(-film.rotation * Math.PI / 180);
    ctx.scale(scale * film.reverse[0], scale * film.reverse[1]);

    if (film.visible) {
      ctx.save();
      ctx.translate(-film.media.naturalWidth * 0.5, -film.media.naturalHeight * 0.5);
      ctx.strokeStyle = '#00000080';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, film.media.naturalWidth, film.media.naturalHeight);
      ctx.restore();
    }
    ctx.restore();
  }
}
