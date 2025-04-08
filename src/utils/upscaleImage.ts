import { get } from 'svelte/store';
import { fileSystem } from '../filemanager/fileManagerStore.js';
import type { UpscaleRequest } from '$protocolTypes/imagingTypes.d';
import { Film } from '../lib/layeredCanvas/dataModels/film.js';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media.js';
import { waitDialog } from './waitDialog.js';
import { saveRequest } from '../filemanager/warehouse.js';
import { toastStore } from '@skeletonlabs/skeleton';
import { onlineStatus } from './accountStore.js';
import { analyticsEvent } from "./analyticsEvent.js";
import { upscale, pollMediaStatus } from "../supabase.js";
import { loading } from './loadingStore.js';

export async function upscaleFilm(film: Film) {
  if (!(film.media instanceof ImageMedia)) { 
    toastStore.trigger({ message: `内部エラー: アップスケールは画像に対してしか使えません`, timeout: 3000});
    return; 
  }
  const imageMedia = film.media as ImageMedia;

  const newCanvas = await upscaleCanvas(imageMedia.drawSourceCanvas);
  if (!newCanvas) { return; }

  film.media = new ImageMedia(newCanvas);
  
  analyticsEvent('upscale');
}

export async function upscaleCanvas(canvas: HTMLCanvasElement, warning: string | null = null): Promise<HTMLCanvasElement | null> {
  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `アップスケールはサインインしてないと使えません`, timeout: 3000});
    return null;
  }

  const request = await waitDialog<UpscaleRequest>('upscaler', { canvas });
  console.log("upscale", request);

  if (!request) { return null; }

  if (warning) {
    toastStore.trigger({ message: warning, timeout: 6000});
  }

  loading.set(true);
  const { requestId } = await upscale(request);
  await saveRequest(get(fileSystem)!, "image", "upscale", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "upscale", requestId});
  loading.set(false);

  return mediaResources[0] as HTMLCanvasElement;
}

export async function upscaleCanvasWithoutDialog(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement | null> {
  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `アップスケールはサインインしてないと使えません`, timeout: 3000});
    return null;
  }

  const request: UpscaleRequest = {
    dataUrl: canvas.toDataURL('image/png'),
    scale: "2x",
    provider: "standard",
  };

  loading.set(true);
  const { requestId } = await upscale(request);
  await saveRequest(get(fileSystem)!, "image", "upscale", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "upscale", requestId});
  loading.set(false);

  return mediaResources[0] as HTMLCanvasElement;
}