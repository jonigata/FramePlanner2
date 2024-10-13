import { writable, type Writable } from "svelte/store";

export const chosenFont: Writable<{ fontFamily: string, fontWeight: string } | null> = writable(null);
export const fontChooserOpen = writable(false);

export type SearchOptions = { filterString: string, mincho: boolean, gothic: boolean, normal: boolean, bold: boolean }
