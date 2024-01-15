import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import type { Book, BookOperators } from './book';
import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';

export const mainBook = writable<Book>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport> = writable(null);
export const bookEditor: Writable<BookOperators> = writable(null);

export type NewPageProperty = {
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
  template: FrameElement,
};

export const newPageProperty: Writable<NewPageProperty> = writable(
  { paperSize: [0, 0], paperColor: null, frameColor: null, frameWidth: 2, template: null }
  );
