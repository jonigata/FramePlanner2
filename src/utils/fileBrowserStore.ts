import { writable, type Writable } from "svelte/store";

export const browserUsedImages: Writable<HTMLImageElement[]> = writable([]);
export const browserStrayImages: Writable<HTMLImageElement[]>= writable([]);
