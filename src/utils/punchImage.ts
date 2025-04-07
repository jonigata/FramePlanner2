import { get } from 'svelte/store';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media.js';
import { Film } from '../lib/layeredCanvas/dataModels/film.js';
import { removeBg, pollMediaStatus } from "../supabase.js";
import { analyticsEvent } from "./analyticsEvent.js";
import { saveRequest } from '../filemanager/warehouse.js';
import { fileSystem } from '../filemanager/fileManagerStore.js';

export async function punchFilm(film: Film) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const dataUrl = imageMedia.drawSourceCanvas.toDataURL("image/png");
  const { requestId } = await removeBg({dataUrl});
  await saveRequest(get(fileSystem)!, "image", "removebg", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "removebg", requestId});

  film.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);

  analyticsEvent('punch');
}
