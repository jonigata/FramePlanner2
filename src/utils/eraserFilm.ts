import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { eraser, pollMediaStatus } from "../supabase";
import { analyticsEvent } from "./analyticsEvent";
import { saveRequest } from '../filemanager/warehouse';
import { fileSystem } from '../filemanager/fileManagerStore';
import { onlineStatus } from './accountStore';
import { waitDialog } from './waitDialog';
import { loading } from './loadingStore';


type ImageMaskRequest = {
  mask: HTMLCanvasElement;
  image: HTMLCanvasElement;
}

export async function eraserFilm(film: Film) {
  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `消しゴムはサインインしてないと使えません`, timeout: 3000});
    return;
  }

  if (!(film.media instanceof ImageMedia)) { 
    toastStore.trigger({ message: `消しゴムは画像のみ使えます`, timeout: 3000});
    return; 
  }
  const imageMedia = film.media as ImageMedia;

  const request = await waitDialog<ImageMaskRequest>('imageMask', { imageSource: imageMedia.drawSource });
  console.log(request);

  /*
  const newCanvas = document.createElement('canvas');
  newCanvas.width = request.image.width;
  newCanvas.height = request.image.height;
  const ctx = newCanvas.getContext('2d')!;
  ctx.drawImage(request.image, 0, 0);
  ctx.drawImage(request.mask, 0, 0);

  await waitDialog<{}>('canvasBrowser', { canvas: newCanvas });
  */

  loading.set(true);
  const maskDataUrl = request.mask.toDataURL("image/png");
  const imageDataUrl = request.image.toDataURL("image/png");
  const { requestId } = await eraser({maskDataUrl, imageDataUrl});
  await saveRequest(get(fileSystem)!, "image", "eraser", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "eraser", requestId});
  loading.set(false);

  film.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);

  analyticsEvent('eraser');
}
