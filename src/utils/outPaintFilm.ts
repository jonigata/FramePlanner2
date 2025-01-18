import { get } from 'svelte/store';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { outPaint, pollImagingStatus } from "../supabase";
import { createCanvasFromImage } from "../lib/layeredCanvas/tools/imageUtil";
import { getAnalytics, logEvent } from "firebase/analytics";
import type { Rect, Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import type { Page } from 'manga-renderer';
import { type FrameElement, calculatePhysicalLayout, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
import { trapezoidBoundingRect } from "../lib/layeredCanvas/tools/geometry/trapezoid";
import { add2D, getRectCenter } from "../lib/layeredCanvas/tools/geometry/geometry";
import { saveRequest } from '../filemanager/warehouse';
import { fileSystem } from '../filemanager/fileManagerStore';

export async function outPaintFilm(film: Film, padding: {left: number, top: number, right: number, bottom: number}) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { 
    return; 
  }

  if (film.reverse[0] < 0) {
    // 左右反転の場合、左右を入れ替える
    const tmp = padding.left;
    padding.left = padding.right;
    padding.right = tmp;
  }
  if (film.reverse[1] < 0) {
    // 上下反転の場合、上下を入れ替える
    const tmp = padding.top;
    padding.top = padding.bottom;
    padding.bottom = tmp;
  }

  const size = { width: imageMedia.canvas.width, height: imageMedia.canvas.height };
  const imageUrl = imageMedia.canvas.toDataURL("image/png");
  const r = await outPaint({dataUrl: imageUrl, size, padding});
  console.log("outpainting result", r);
  await saveRequest(get(fileSystem)!, "removebg", r.request_id);

  const { images } = await pollImagingStatus("outpaint", r.request_id);
  const canvas = createCanvasFromImage(images[0]);

  const newFilm = film.clone();
  newFilm.media = new ImageMedia(canvas);

  // 画像スケール
  // 元画像が大きすぎる場合、fal.aiがアスペクト比を維持したまま縮小するケースがあるので対応する
  const oldImageSize = Math.min(film.media.naturalWidth, film.media.naturalHeight) ;
  const newActualImageSize = Math.min(canvas.width, canvas.height);
  const newIdealImageSize = Math.min(size.width + padding.left + padding.right, size.height + padding.top + padding.bottom);
  const newScale = film.n_scale / oldImageSize * newActualImageSize;
  newFilm.n_scale = newScale * (newIdealImageSize / newActualImageSize);
  newFilm.n_translation = [0, 0]; // 微妙にずれるケースがあるが諦める

  logEvent(getAnalytics(), 'outpaint');

  console.log("B", newFilm);
  return newFilm;
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

  const left = Math.max(0, Math.ceil((inner.left - outerLeft) / scale / 64) * 64);
  const top = Math.max(0, Math.ceil((inner.top - outerTop) / scale / 64) * 64);
  const right = Math.max(0, Math.ceil((outerRight - inner.right) / scale / 64) * 64);
  const bottom = Math.max(0, Math.ceil((outerBottom - inner.bottom) / scale / 64) * 64);

  return {left, top, right, bottom};
}

export function calculateFramePadding(page: Page, frame: FrameElement, film: Film): {left: number, top: number, right: number, bottom: number} {
  const paperSize = page.paperSize;
  const pageLayout = calculatePhysicalLayout(page.frameTree, paperSize, [0,0]);
  const leafLayout = findLayoutOf(pageLayout, frame);
  const outerRect = trapezoidBoundingRect(leafLayout!.corners);
  const center = getRectCenter(outerRect);
  const scale = film.getShiftedScale(paperSize);
  const translation = add2D(film.getShiftedTranslation(paperSize), center);
  const padding = calculatePadding(outerRect, film.media.size, scale, translation);
  return padding;
}