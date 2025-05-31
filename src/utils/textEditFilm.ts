import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { textEdit, pollMediaStatus } from "../supabase";
import { analyticsEvent } from "./analyticsEvent";
import { saveRequest } from '../filemanager/warehouse';
import { mainBookFileSystem } from '../filemanager/fileManagerStore';
import { onlineStatus } from './accountStore';
import { waitDialog } from './waitDialog';
import { loading } from './loadingStore';

type TextEditDialogResult = {
  image: HTMLCanvasElement;
  prompt: string;
}

export async function textEditFilm(film: Film) {
  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `テキスト編集はサインインしてないと使えません`, timeout: 3000});
    return;
  }

  if (!(film.media instanceof ImageMedia)) { 
    toastStore.trigger({ message: `テキスト編集は画像のみ使えます`, timeout: 3000});
    return; 
  }
  const imageMedia = film.media as ImageMedia;

  const request = await waitDialog<TextEditDialogResult>('textedit', { title: "テキスト編集", imageSource: imageMedia.drawSource });
  console.log(request);
  if (!request) {
    return;
  }    

  loading.set(true);
  const imageDataUrl = request.image.toDataURL("image/png");
  const { requestId } = await textEdit({imageDataUrl, prompt: request.prompt});
  await saveRequest(get(mainBookFileSystem)!, "image", "textedit", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "textedit", requestId});
  loading.set(false);

  const newFilm = film.clone();
  newFilm.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);

  analyticsEvent('textedit');
  return newFilm;
}