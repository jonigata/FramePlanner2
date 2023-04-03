import { writable } from "svelte/store";

export const paperTemplate = writable(null);
export const paperWidth = writable(840);
export const paperHeight = writable(1188);
export const saveToken = writable(false);
export const clipboardToken = writable(false);
export const importingImage = writable(null);
export const paperColor = writable('#ffffff');
export const frameColor = writable('#000000');
export const frameWidth = writable(1);
