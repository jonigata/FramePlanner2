import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { outPaint } from "../firebase";
import { createCanvasFromImage } from "../lib/layeredCanvas/tools/imageUtil";
import { getAnalytics, logEvent } from "firebase/analytics";
import type { Rect, Vector } from '../lib/layeredCanvas/tools/geometry/geometry';

export async function outPaintFilm(film: Film, padding: {left: number, top: number, right: number, bottom: number}) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const imageUrl = imageMedia.canvas.toDataURL("image/png");
  const r = await outPaint(imageUrl, padding);
  console.log(r);

  const resultImage = document.createElement('img');
  resultImage.src = "data:image/png;base64," + r.result.images[0];
  await resultImage.decode();

  const canvas = createCanvasFromImage(resultImage);
  film.media = new ImageMedia(canvas);

  logEvent(getAnalytics(), 'outpaint');
}

// 外側の矩形と内側の矩形が与えられ、内側の矩形が外側の矩形を内包する最小の余白（ただし64px単位）を計算する
export function calculatePadding(outer: Rect, size: Vector, scale: number, translate: Vector): {left: number, top: number, right: number, bottom: number} {
  const [outerLeft, outerTop, outerWidth, outerHeight] = outer;
  const outerRight = outerLeft + outerWidth;
  const outerBottom = outerTop + outerHeight;
  const inner = {
    left: translate[0] - size[0] * scale / 2,
    top: translate[1] - size[1] * scale / 2,
    right: translate[0] + size[0] * scale / 2,
    bottom: translate[1] + size[1] * scale / 2,
  };

  console.log("outer", outer);
  console.log("inner", inner);

  const left = Math.max(0, Math.ceil((inner.left - outerLeft) / scale / 64) * 64);
  const top = Math.max(0, Math.ceil((inner.top - outerTop) / scale / 64) * 64);
  const right = Math.max(0, Math.ceil((outerRight - inner.right) / scale / 64) * 64);
  const bottom = Math.max(0, Math.ceil((outerBottom - inner.bottom) / scale / 64) * 64);

  return {left, top, right, bottom};
}
