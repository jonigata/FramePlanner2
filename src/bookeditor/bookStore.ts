import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import type { Book, BookOperators } from './book';
//import writableDerived from "svelte-writable-derived";

export const mainBook = writable<Book>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport> = writable(null);
export const bookEditor: Writable<BookOperators> = writable(null);
export const redrawToken = writable(false);

export type NewPageProperty = {
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
  templateIndex: number,
};

export const newPageProperty: Writable<NewPageProperty> = writable({
  paperSize: [0, 0],
  paperColor: null, 
  frameColor: null, 
  frameWidth: 2, 
  templateIndex: 0,
});

/*
export const newPageProperty2: Writable<NewPageProperty> = writable({
  paperSize: [0, 0],
  paperColor: null, 
  frameColor: null, 
  frameWidth: 2, 
  template: FrameElement.compile(frameExamples[0]) 
});

export const newPageProperty = writableDerived(
  newPageProperty2,
  (npp) => npp,
  (b, npp) => {
    console.trace();
    return npp;
  }
) 
*/