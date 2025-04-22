import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
// import { eraser, pollMediaStatus } from "../supabase";
import { analyticsEvent } from "./analyticsEvent";
import { saveRequest } from '../filemanager/warehouse';
import { fileSystem } from '../filemanager/fileManagerStore';
import { onlineStatus } from './accountStore';
import { waitDialog } from './waitDialog';

type ImageMaskRequest = {
  maskCanvas: HTMLCanvasElement;
  imageCanvas: HTMLCanvasElement;
}

export async function eraserFilm(film: Film) {
  if (!(film.media instanceof ImageMedia)) { 
    return; 
  }
  const imageMedia = film.media as ImageMedia;

  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `消しゴムはサインインしてないと使えません`, timeout: 3000});
    return;
  }

  const request = await waitDialog<ImageMaskRequest>('imageMask', { imageSource: film.media.drawSource });
  console.log(request);
}
