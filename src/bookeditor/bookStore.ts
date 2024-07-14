import { type Writable, writable, derived, get } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import { type Book, type BookOperators, newPage } from './book';
import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
//import writableDerived from "svelte-writable-derived";

export const mainBook = writable<Book>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport> = writable(null);
export const bookEditor: Writable<BookOperators> = writable(null);
export const redrawToken = writable(false);
export const undoToken: Writable<'undo' | 'redo'> = writable(null);
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

export function insertNewPageToBook(book: Book, p: NewPageProperty, index: number) {
  const example = frameExamples[p.templateIndex];
  const bubbles = example.bubbles.map(b => Bubble.compile(p.paperSize, b));
  const page = newPage(FrameElement.compile(example.frameTree), bubbles);
  page.paperSize = [...p.paperSize];
  page.paperColor = p.paperColor;
  page.frameColor = p.frameColor;
  page.frameWidth = p.frameWidth;
  book.pages.splice(index, 0, page);
}
