import type { Film } from "../../lib/layeredCanvas/dataModels/film";
import { redrawToken } from "../../bookeditor/bookStore";
import { PubSubQueue } from "../pubsub";

export const effectProcessorQueue = new PubSubQueue<Film>();
effectProcessorQueue.subscribe(async (film: Film) => {
  console.log("Processing film", film);
  let inputMedia = film.media;
  for (const effect of film.effects) {
    effect.cleanInput();
    inputMedia = await effect.apply(inputMedia);
  }
  redrawToken.set(true);
});

