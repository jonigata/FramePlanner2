import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { removeBg } from "../supabase";
import { createCanvasFromBlob } from "../lib/layeredCanvas/tools/imageUtil";
import { getAnalytics, logEvent } from "firebase/analytics";

export async function punchFilm(film: Film) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const dataUrl = imageMedia.canvas.toDataURL("image/png");
  const r = await removeBg({dataUrl});

  const response = await fetch(r.url);
  const canvas = await createCanvasFromBlob(await response.blob());
  film.media = new ImageMedia(canvas);

  logEvent(getAnalytics(), 'punch');
}
