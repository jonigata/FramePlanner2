import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import type { Book, BookOperators } from './book';
//import writableDerived from "svelte-writable-derived";

export const mainBook = writable<Book>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport> = writable(null);
export const bookEditor: Writable<BookOperators> = writable(null);
export const redrawToken = writable(false);
export const forceFontLoadToken = writable(false);
export const forceCommitDelayedToken: Writable<boolean> = writable(false);
export const fontLoadToken: Writable<{family: string, weight: string}[]> = writable(null);

export type NewPageProperty = {
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
  templateIndex: number,
};

export const newPageProperty: Writable<NewPageProperty> = writable({
  paperSize: [840, 1188],
  paperColor: "#FFFFFF", 
  frameColor: "#000000", 
  frameWidth: 2, 
  templateIndex: 0,
});
