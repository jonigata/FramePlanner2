import { type Writable, writable } from "svelte/store";
import type { FilmStack } from "../lib/layeredCanvas/dataModels/film";

export type ImageGeneratorTarget = {
  filmStack: FilmStack;
  initialPrompt: string | null;
  gallery: HTMLCanvasElement[];
  onDone: (r: {canvas: HTMLCanvasElement, prompt: string} | null) => void,
}

export const imageGeneratorTarget: Writable<ImageGeneratorTarget | null> = writable(null);
