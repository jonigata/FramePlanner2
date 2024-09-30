import { type Writable, writable } from "svelte/store";

export const imageViewerTarget: Writable<HTMLCanvasElement> = writable(null);
