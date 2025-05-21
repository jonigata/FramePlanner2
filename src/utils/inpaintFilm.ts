import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { inPaint, pollMediaStatus } from "../supabase";
import { analyticsEvent } from "./analyticsEvent";
import { saveRequest } from '../filemanager/warehouse';
import { mainBookFileSystem } from '../filemanager/fileManagerStore';
import { onlineStatus } from './accountStore';
import { waitDialog } from './waitDialog';
import { loading } from './loadingStore';

type InpaintDialogResult = {
  mask: HTMLCanvasElement;
  image: HTMLCanvasElement;
  prompt: string;
}

export async function inpaintFilm(film: Film) {
  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `インペイントはサインインしてないと使えません`, timeout: 3000});
    return;
  }

  if (!(film.media instanceof ImageMedia)) { 
    toastStore.trigger({ message: `インペイントは画像のみ使えます`, timeout: 3000});
    return; 
  }
  const imageMedia = film.media as ImageMedia;

  const request = await waitDialog<InpaintDialogResult>('inpaint', { title: "インペイント", imageSource: imageMedia.drawSource });
  console.log(request);
  if (!request) {
    return;
  }    

  // const newCanvas = document.createElement('canvas');
  // newCanvas.width = request.image.width;
  // newCanvas.height = request.image.height;
  // const ctx = newCanvas.getContext('2d')!;
  // ctx.drawImage(request.image, 0, 0);
  // ctx.drawImage(request.mask, 0, 0);

  // await waitDialog<{}>('canvasBrowser', { canvas: newCanvas });

  // ここ


  // request.maskを白黒画像に変換（アルファ値128未満なら白、そうでなければ黒）
  {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = request.mask.width;
    maskCanvas.height = request.mask.height;
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.drawImage(request.mask, 0, 0);
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = maskImageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      const value = alpha >= 128 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
    maskCtx.putImageData(maskImageData, 0, 0);
    request.mask = maskCanvas;
  }

  loading.set(true);
  const maskDataUrl = request.mask.toDataURL("image/png");
  const imageDataUrl = request.image.toDataURL("image/png");
  const { requestId } = await inPaint({maskDataUrl, imageDataUrl, prompt: request.prompt});
  await saveRequest(get(mainBookFileSystem)!, "image", "inpaint", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "inpaint", requestId});
  loading.set(false);

  film.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);

  analyticsEvent('eraser');
}
