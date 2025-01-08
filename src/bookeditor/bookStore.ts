import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import { type Book, type BookOperators, newPage } from '../lib/book/book';
import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";

export const mainBook = writable<Book | null>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport | null> = writable(null);
export const bookEditor: Writable<BookOperators | null> = writable(null);
export const redrawToken = writable(false);
// redrawToken.subscribe(value => {
//   console.trace('redrawToken changed:', value);
// });
export const undoToken: Writable<'undo' | 'redo' | null> = writable(null);
export const forceFontLoadToken = writable(false);
export const fontLoadToken: Writable<{family: string, weight: string}[] | null> = writable(null);

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

