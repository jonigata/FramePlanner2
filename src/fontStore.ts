import { writable } from "svelte/store";

export const chosenFont = writable(null);
export const fontChooserOpened = writable(false);
