import { writable, type Writable } from "svelte/store";

export const browserUsedImages: Writable<HTMLCanvasElement[]> = writable([]);
export const browserStrayImages: Writable<HTMLCanvasElement[]>= writable([]);
