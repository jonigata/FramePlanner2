import { writable } from "svelte/store";

export const paperTemplate = writable(null);
export const saveToken = writable(null);
export const clipboardToken = writable(false);
export const importingImage = writable(null);
