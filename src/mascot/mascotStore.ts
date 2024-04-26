import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export const mascotVisible = writable(false);
export const mascotWindowRect: Writable<DOMRect> = writable(new DOMRect(0, 0, 500, 700));
