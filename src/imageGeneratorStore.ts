import { writable } from "svelte/store";

export const imageGeneratorOpen = writable(false);
export const imageGeneratorPrompt = writable(null);
export const imageGeneratorGallery = writable([]);
export const imageGeneratorChosen = writable(null);
