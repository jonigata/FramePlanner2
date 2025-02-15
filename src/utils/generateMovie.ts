import { get } from 'svelte/store';
import { fileSystem } from '../filemanager/fileManagerStore';
import type { ImageToVideoRequest } from '$protocolTypes/imagingTypes';
import { Film, FilmStack } from '../lib/layeredCanvas/dataModels/film';
import { ImageMedia, VideoMedia } from '../lib/layeredCanvas/dataModels/media';
import { waitDialog } from '../utils/waitDialog';
import { image2Video } from '../supabase';
import { saveRequest } from '../filemanager/warehouse';
import { loading } from './loadingStore';
import { filmProcessorQueue } from './filmprocessor/filmProcessorStore';
import { toastStore } from '@skeletonlabs/skeleton';
import { onlineStatus } from './accountStore';

export async function generateMovie(filmStack: FilmStack, film: Film) {
  if (!(film.media instanceof ImageMedia)) { 
    toastStore.trigger({ message: `内部エラー: 動画生成は画像に対してしか使えません`, timeout: 3000});
    return; 
  }

  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `動画生成はサインインしてないと使えません`, timeout: 3000});
    return;
  }

  const request = await waitDialog<ImageToVideoRequest>('videoGenerator', { media: film.media });
  console.log("modalFrameVideo", request);

  if (!request) { return; }

  loading.set(true);
  try {
    const { requestId: request_id } = await image2Video(request);
    await saveRequest(get(fileSystem)!, "video", "kling", request_id);

    const newMedia = new VideoMedia({ mediaType: "video", mode: "kling", requestId: request_id });
    const newFilm = new Film(newMedia);
    filmProcessorQueue.publish(newFilm);

    const index = filmStack.films.indexOf(film);
    filmStack.films.splice(index + 1, 0, newFilm);
    loading.set(false);

    toastStore.trigger({ message: `ムービー生成には6分程度かかります`, timeout: 3000});
  }
  catch (e) {
    loading.set(false);
    toastStore.trigger({ message: `動画生成に失敗しました`, timeout: 3000});
  }
}