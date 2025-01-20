import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { removeBg, pollMediaStatus } from "../supabase";
import { getAnalytics, logEvent } from "firebase/analytics";

export async function punchFilm(film: Film) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const dataUrl = imageMedia.drawSourceCanvas.toDataURL("image/png");
  const r = await removeBg({dataUrl});

  const { mediaResources } = await pollMediaStatus("image", "removebg", r.request_id);

  film.media = new ImageMedia(mediaResources[0] as HTMLCanvasElement);

  logEvent(getAnalytics(), 'punch');
}
