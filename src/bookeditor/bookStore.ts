import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import { type Book, type BookOperators, newPage } from '../lib/book/book';
import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";

export const mainBook = writable<Book | null>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport | null> = writable(null);
export const bookOperators: Writable<BookOperators | null> = writable(null);
export const redrawToken = writable(false);
// redrawToken.subscribe(value => {
//   console.trace('redrawToken changed:', value);
// });
export const undoToken: Writable<'undo' | 'redo' | null> = writable(null);
export const forceFontLoadToken = writable(false);
export const fontLoadToken: Writable<{family: string, weight: string}[] | null> = writable(null);

export function insertNewPageToBook(book: Book, index: number) {
  const p = book.newPageProperty;
  const example = frameExamples[p.templateName];
  const bubbles = example.bubbles.map((b: any) => Bubble.compile(p.paperSize, b));
  const page = newPage(FrameElement.compile(example.frameTree), bubbles);
  page.paperSize = [...p.paperSize];
  page.paperColor = p.paperColor;
  page.frameColor = p.frameColor;
  page.frameWidth = p.frameWidth;
  book.pages.splice(index, 0, page);
  return page;
}

