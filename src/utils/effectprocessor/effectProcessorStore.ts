import { type Writable, writable } from "svelte/store"
import { Film } from "../../lib/layeredCanvas/dataModels/film";
import { redrawToken } from "../../bookeditor/bookStore";

export const effectProcessorStore: Writable<Film[]> = writable([]);

let running = false;
effectProcessorStore.subscribe(
  async (films) => {
    console.log("EffectProcessorStore", running, films.length);
    if (running || films.length == 0) { return; }
    running = true;

    // unique
    const unique = new Set<Film>();
    for (const film of films) {
      unique.add(film);
    }
    films = Array.from(unique);
    console.log("EffectProcessorStore(unique)", films);

    for (const film of films) {
      let inputMedia = film.media;
      for (const effect of film.effects) {
        inputMedia = await effect.apply(inputMedia);
      }
    }
    running = false;
    effectProcessorStore.set([]);
    redrawToken.set(true);
  });