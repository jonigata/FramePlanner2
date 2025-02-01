import type { Film } from "../../lib/layeredCanvas/dataModels/film";
import { redrawToken } from "../../bookeditor/bookStore";
import { PubSubQueue } from "../pubsub";
import { pollMediaStatus } from '../../supabase';
import type { RemoteMediaReference } from "src/lib/filesystem/fileSystem";

export const filmProcessorQueue = new PubSubQueue<Film>();
filmProcessorQueue.subscribe(async (film: Film) => {
  if (!film.media.isLoaded) {
    // Unmaterializedメディアの場合、ロード
    const rmr = film.media.persistentSource as RemoteMediaReference;
    const { mediaResources }  = await pollMediaStatus(rmr);
    if (mediaResources.length > 0) {
      film.media.setMedia(mediaResources[0]);
    }
  }

  let inputMedia = film.media;
  for (const effect of film.effects) {
    inputMedia = await effect.apply(inputMedia);
  }
  redrawToken.set(true);
});

