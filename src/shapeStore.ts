import { writable, type Writable } from "svelte/store";

export const shapeChooserOpen = writable(false);
export const chosenShape: Writable<string> = writable(null);
