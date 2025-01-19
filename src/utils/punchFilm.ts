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

/*
  お金のかからない実験用
  let imageRequest: TextToImageRequest = {
    prompt: "1 chibi girl with a sword", 
    image_size: {width: 512, height: 512},
    num_images: 1,
    mode: "schnell", 
  };
  console.log(imageRequest);
  const { request_id } = await text2Image(imageRequest);
  film.media = new ImageMedia({requestId: request_id, mode: "schnell"});
  filmProcessorQueue.publish(film);
*/

  logEvent(getAnalytics(), 'punch');
}
