import { type Writable, writable } from "svelte/store";
import type { FilmStack } from "../lib/layeredCanvas/dataModels/film";
import type { Media } from "../lib/layeredCanvas/dataModels/media";

export type ImageGeneratorTarget = {
  filmStack: FilmStack;
  initialPrompt: string | null;
  gallery: Media[];
  onDone: (r: {media: Media, prompt: string} | null) => void,
}

export const imageGeneratorTarget: Writable<ImageGeneratorTarget | null> = writable(null);
