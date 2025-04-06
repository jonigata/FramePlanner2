import { get } from 'svelte/store';
import { fileSystem } from '../filemanager/fileManagerStore';
import type { UpscaleRequest } from '$protocolTypes/imagingTypes.d';
import { Film, FilmStack } from '../lib/layeredCanvas/dataModels/film';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { waitDialog } from './waitDialog';
import { saveRequest } from '../filemanager/warehouse';
import { toastStore } from '@skeletonlabs/skeleton';
import { onlineStatus } from './accountStore';
import { analyticsEvent } from "./analyticsEvent";
import { upscale, pollMediaStatus } from "../supabase";
import { loading } from './loadingStore';
import { load } from 'webfontloader';

export async function upscaleFilm(film: Film) {
  if (!(film.media instanceof ImageMedia)) { 
    toastStore.trigger({ message: `内部エラー: アップスケールは画像に対してしか使えません`, timeout: 3000});
    return; 
  }
  const imageMedia = film.media as ImageMedia;

  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `アップスケールはサインインしてないと使えません`, timeout: 3000});
    return;
  }

  const request = await waitDialog<UpscaleRequest>('upscaler', { media: imageMedia });
  console.log("upscale", request);

  if (!request) { return; }

  loading.set(true);
  const dataUrl = imageMedia.drawSourceCanvas.toDataURL("image/png");
  const { requestId } = await upscale({
    dataUrl,
    scale: "2x",
    provider: "standard"
  });
  await saveRequest(get(fileSystem)!, "image", "upscale", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "upscale", requestId});

  film.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);
  loading.set(false);
  
  analyticsEvent('upscale');
}