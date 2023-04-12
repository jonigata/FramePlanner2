import { writable } from "svelte/store";

export const isJsonEditorOpen = writable(false);
export const jsonEditorInput = writable(null);
export const jsonEditorOutput = writable(null);
export const downloadJsonToken = writable(false);
