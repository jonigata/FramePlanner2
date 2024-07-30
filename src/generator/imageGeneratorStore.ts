import { type Writable, writable } from "svelte/store";
import type { FilmStack } from "../lib/layeredCanvas/dataModels/film";

export type ImageGeneratorTarget = {
  filmStack: FilmStack;
  initialPrompt: string;
  gallery: HTMLCanvasElement[];
  onDone: (r: {canvas: HTMLCanvasElement, prompt: string}) => void,
}

export const imageGeneratorTarget: Writable<ImageGeneratorTarget> = writable(null);
