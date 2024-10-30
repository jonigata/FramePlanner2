import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { removeBg } from "../firebase";
import { createCanvasFromImage } from "../lib/layeredCanvas/tools/imageUtil";
import { getAnalytics, logEvent } from "firebase/analytics";

export async function punchFilm(film: Film) {
  const imageMedia = film.media as ImageMedia;
  if (!(imageMedia instanceof ImageMedia)) { return; }

  const dataUrl = imageMedia.canvas.toDataURL("image/png");
  const r = await removeBg(dataUrl);

  const image = document.createElement('img');
  image.src = "data:image/png;base64," + r.result.image;
  await image.decode();

  const canvas = createCanvasFromImage(image);
  film.media = new ImageMedia(canvas);

  logEvent(getAnalytics(), 'punch');
}
