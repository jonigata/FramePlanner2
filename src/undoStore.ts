import { writable } from "svelte/store";

export const undoStore = writable(null);
export const commitToken = writable(false);
