import { writable } from "svelte/store";

export type DominantMode = "standard" | "painting";
export const dominantMode = writable<DominantMode>("standard");
