import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { analyticsEvent } from "./analyticsEvent";
import { waitDialog } from './waitDialog';
import { requireSignIn } from './signInPrompt';
import type { ImagingModel, TextToImageRequest } from '$protocolTypes/imagingTypes';
import type { Media } from '../lib/layeredCanvas/dataModels/media';
import { getSizeRangeForMode, inferProvider, modeOptions } from './feathralImaging';
import { filmProcessorQueue } from './filmprocessor/filmProcessorStore';
import { calculateAspectPreservingSize } from '../lib/layeredCanvas/tools/imageUtil';

type TextEditDialogResult = {
  image: HTMLCanvasElement;
  prompt: string;
  model: ImagingModel;
  referenceImages: Media[];
}

const GPT_IMAGE_2_MAX_TEXT_EDIT_ASPECT = 3;
const GPT_IMAGE_2_SIZE_UNIT = 16;

function isGptImage2(model: ImagingModel): boolean {
  return model.startsWith('gpt-image-2/');
}

function roundUpToUnit(value: number, unit: number): number {
  return Math.max(unit, Math.ceil(value / unit) * unit);
}

function padCanvasToMaxAspect(canvas: HTMLCanvasElement, maxAspect: number): HTMLCanvasElement {
  const width = Math.max(1, canvas.width);
  const height = Math.max(1, canvas.height);
  const aspect = Math.max(width / height, height / width);

  let paddedWidth = width;
  let paddedHeight = height;
  if (aspect > maxAspect) {
    if (width > height) {
      paddedHeight = Math.ceil(width / maxAspect);
    } else {
      paddedWidth = Math.ceil(height / maxAspect);
    }
  }

  paddedWidth = roundUpToUnit(paddedWidth, GPT_IMAGE_2_SIZE_UNIT);
  paddedHeight = roundUpToUnit(paddedHeight, GPT_IMAGE_2_SIZE_UNIT);

  if (paddedWidth === canvas.width && paddedHeight === canvas.height) {
    return canvas;
  }

  const padded = document.createElement('canvas');
  padded.width = paddedWidth;
  padded.height = paddedHeight;
  const ctx = padded.getContext('2d')!;
  ctx.clearRect(0, 0, paddedWidth, paddedHeight);
  ctx.drawImage(canvas, (paddedWidth - width) / 2, (paddedHeight - height) / 2);
  return padded;
}

function resolveTextEditImage(model: ImagingModel, image: HTMLCanvasElement): {
  image: HTMLCanvasElement;
  imageSize: { width: number; height: number };
} {
  if (!isGptImage2(model)) {
    return {
      image,
      imageSize: { width: image.width, height: image.height },
    };
  }

  const adjustedImage = padCanvasToMaxAspect(image, GPT_IMAGE_2_MAX_TEXT_EDIT_ASPECT);
  const sizeRange = getSizeRangeForMode(model);
  const imageSize = calculateAspectPreservingSize(
    { width: adjustedImage.width, height: adjustedImage.height },
    sizeRange.min,
    128,
    sizeRange.max,
    sizeRange.min,
  );

  return { image: adjustedImage, imageSize };
}

export async function textEditFilmInline(film: Film): Promise<Film | null> {
  if (!await requireSignIn('対話編集はサインインしてないと使えません')) {
    return null;
  }

  if (film.content.kind !== 'media' || !(film.content.media instanceof ImageMedia)) {
    toastStore.trigger({ message: `対話編集は画像のみ使えます`, timeout: 3000});
    return null;
  }
  const imageMedia = film.content.media as ImageMedia;

  const request = await waitDialog<TextEditDialogResult>('textedit', { title: "対話編集", imageSource: imageMedia.drawSource });
  console.log(request);
  if (!request) {
    return null;
  }

  const textEditImage = resolveTextEditImage(request.model, request.image);

  // メイン画像のDataURLを作成
  const imageDataUrl = textEditImage.image.toDataURL("image/png");
  const imageDataUrls = [imageDataUrl];

  // 参考画像を追加（refRange.maxを上限に適用）
  const refMax = modeOptions.find(o => o.value === request.model)?.refRange?.max ?? 0;
  for (const media of request.referenceImages.slice(0, Math.max(0, refMax))) {
    if (media instanceof ImageMedia) {
      const refImage = isGptImage2(request.model)
        ? padCanvasToMaxAspect(media.drawSource, GPT_IMAGE_2_MAX_TEXT_EDIT_ASPECT)
        : media.drawSource;
      const refImageDataUrl = refImage.toDataURL("image/png");
      imageDataUrls.push(refImageDataUrl);
    }
  }
  console.log(`Added ${request.referenceImages.length} reference images to request`);

  // TextToImageRequest を構築（refImage>=1 で i2i/textedit 扱い）
  const req: TextToImageRequest = {
    option: { kind: 'none' },
    provider: inferProvider(request.model),
    prompt: request.prompt,
    imageSize: textEditImage.imageSize,
    numImages: 1,
    model: request.model,
    background: 'auto',
    imageDataUrls,
  };

  // beforeRequest形式でImageMediaを作成
  const newMedia = new ImageMedia({
    mediaType: 'image',
    mode: 'beforeRequest',
    action: 'texttoimage',
    request: req
  });

  const newFilm = film.clone();
  newFilm.media = newMedia;

  // filmProcessorQueueに登録
  filmProcessorQueue.publish({ film: newFilm });

  analyticsEvent('textedit');

  console.log("textEditFilmInline: created beforeRequest film", newFilm);
  return newFilm;
}
