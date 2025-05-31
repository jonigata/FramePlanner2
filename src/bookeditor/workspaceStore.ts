import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import { type Book, type BookOperators, newPage } from '../lib/book/book';
import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { loadFonts } from "./fontLoading"

export const mainBook = writable<Book | null>(null);
export const mainBookTitle = writable('');
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport | null> = writable(null);
export const bookOperators: Writable<BookOperators | null> = writable(null);
export const redrawToken = writable(false);
// redrawToken.subscribe(value => {
//   console.trace('redrawToken changed:', value);
// });
export const undoToken: Writable<'undo' | 'redo' | null> = writable(null);
export const fontLoadToken: Writable<{family: string, weight: string}[]> = writable([]);
export const resetFontCacheKey = writable(0);

export let mainBookExceptionHandler: Writable<((e: any) => void) | null> = writable(null);

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

// automatic font loading
let lastBookId = "";

mainBook.subscribe(async (book: Book | null) => {
  if (!book) { return; }
  if (lastBookId === book.revision.id) { return; }
  lastBookId = book.revision.id;

  const fonts = [];
  for (let page of book.pages) {
    for (let bubble of page.bubbles) {
      fonts.push({family: bubble.fontFamily, weight: bubble.fontWeight});
    }
  }
  if (await loadFonts(fonts)) { 
    resetFontCacheKey.update(value => value + 1);
  }
});

fontLoadToken.subscribe(async (fonts) => {
  if (!fonts || fonts.length == 0) { return; }
  console.log("onFontLoadToken", fonts);
  fontLoadToken.set([]);
  if (await loadFonts(fonts)) { 
    resetFontCacheKey.update(value => value + 1);
  }
});
