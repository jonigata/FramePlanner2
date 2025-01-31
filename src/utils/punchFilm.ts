import { get } from 'svelte/store';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { removeBg, pollMediaStatus } from "../supabase";
import { getAnalytics, logEvent } from "firebase/analytics";
import { saveRequest } from '../filemanager/warehouse';
import { fileSystem } from '../filemanager/fileManagerStore';

export async function punchFilm(film: Film) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const dataUrl = imageMedia.drawSourceCanvas.toDataURL("image/png");
  const { requestId } = await removeBg({dataUrl});
  await saveRequest(get(fileSystem)!, "image", "removebg", requestId);

  const { mediaResources } = await pollMediaStatus({mediaType: "image", mode: "removebg", requestId});

  film.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);

  logEvent(getAnalytics(), 'punch');
}
