import { get } from 'svelte/store';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { removeBg, pollImagingStatus } from "../supabase";
import { createCanvasFromImage } from "../lib/layeredCanvas/tools/imageUtil";
import { getAnalytics, logEvent } from "firebase/analytics";
import { saveRequest } from '../filemanager/warehouse';
import { fileSystem } from '../filemanager/fileManagerStore';

export async function punchFilm(film: Film) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const dataUrl = imageMedia.canvas.toDataURL("image/png");
  const r = await removeBg({dataUrl});
  await saveRequest(get(fileSystem)!, "removebg", r.request_id);

  const { images } = await pollImagingStatus("removebg", r.request_id);

  const canvas = createCanvasFromImage(images[0]);
  film.media = new ImageMedia(canvas);

  logEvent(getAnalytics(), 'punch');
}
