import { writable, type Writable } from "svelte/store";

export const shapeChooserOpen: Writable<boolean> = writable(false);
export const chosenShape: Writable<string> = writable('soft');

