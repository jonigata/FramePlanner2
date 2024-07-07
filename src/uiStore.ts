import { writable } from "svelte/store";

export const bodyDragging = writable(false);

export type DominantMode = "standard" | "painting";
export const dominantMode = writable<DominantMode>("standard");
