import { type Writable, writable } from "svelte/store";
import type { FilmStack } from "../lib/layeredCanvas/dataModels/film";

export type ImageGeneratorTarget = {
  filmStack: FilmStack;
  initialPrompt: string;
  gallery: HTMLImageElement[];
  onDone: (r: {image: HTMLImageElement, prompt: string}) => void,
}

export const imageGeneratorTarget: Writable<ImageGeneratorTarget> = writable(null);
