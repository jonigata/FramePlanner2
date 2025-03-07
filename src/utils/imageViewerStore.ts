import { type Writable, writable } from "svelte/store";

export const imageViewerTarget: Writable<HTMLCanvasElement | null> = writable(null);
