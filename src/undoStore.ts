import { writable } from "svelte/store";

export const undoStore = writable(null);
export const commitIfDirtyToken = writable(false);
export const commitToken = writable(null); // tag
