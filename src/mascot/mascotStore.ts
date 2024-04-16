import { writable } from "svelte/store";

export const mascotVisible = writable(false);
export const mascotWindowRect = writable({ x: 0, y: 0, width: 0, height: 0 });
