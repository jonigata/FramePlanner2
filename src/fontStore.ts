import { writable } from "svelte/store";

export const chosenFont = writable(null);
export const fontChooserOpen = writable(false);

export type SearchOptions = { filterString: string, mincho: boolean, gothic: boolean, normal: boolean, bold: boolean }
