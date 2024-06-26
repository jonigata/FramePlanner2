import { type Writable, writable } from "svelte/store";
import type { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import type { Page } from '../bookeditor/book';

export type ImageGeneratorTarget = {
  page: Page,
  frame: FrameElement,
  onDone: (r: {image: HTMLImageElement, prompt: string}) => void,
}

export const imageGeneratorTarget: Writable<ImageGeneratorTarget> = writable(null);
