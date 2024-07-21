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

    let media = film.media;
    for (let i = film.effects.length - 1; 0 <= i; i--) {
      if (film.effects[i].outputMedia) {
        media = film.effects[i].outputMedia;
        break;
      }
    }

    ctx.save();
    ctx.translate(-media.naturalWidth * 0.5, -media.naturalHeight * 0.5);
    ctx.drawImage(media.drawSource, 0, 0, media.naturalWidth, media.naturalHeight);
    ctx.restore();

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
