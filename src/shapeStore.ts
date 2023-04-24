import { writable } from "svelte/store";

export const shapeChooserOpen = writable(false);
export const chosenShape = writable(null);
