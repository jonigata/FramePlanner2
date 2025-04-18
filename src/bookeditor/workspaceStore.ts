import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas.js";
import { type Book, type BookOperators, newPage } from '../lib/book/book.js';
import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples.js";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree.js";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble.js";
import { loadGoogleFontForCanvas } from "../lib/layeredCanvas/tools/googleFont.js";

export const mainBook = writable<Book | null>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport | null> = writable(null);
export const bookOperators: Writable<BookOperators | null> = writable(null);
export const redrawToken = writable(false);
// redrawToken.subscribe(value => {
//   console.trace('redrawToken changed:', value);
// });
export const undoToken: Writable<'undo' | 'redo' | null> = writable(null);
export const fontLoadToken: Writable<{family: string, weight: string}[] | null> = writable(null);
export const resetFontCacheToken = writable(false);

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

// font
mainBook.subscribe(onBookChanged);
fontLoadToken.subscribe(async (fonts) => {
  if (!fonts) { return; }
  for (let font of fonts) {
    await load(font.family, font.weight);
  }
  resetFontCacheToken.set(true);
});

let lastBookId = "";

async function onBookChanged(book: Book | null) {
  console.log("onBookChanged", book?.revision.id);
  if (!book) { return; }
  if (lastBookId === book.revision.id) { return; }
  lastBookId = book.revision.id;

  for (let page of book.pages) {
    for (let bubble of page.bubbles) {
      try {
        await load(bubble.fontFamily, bubble.fontWeight)
      }
      catch (e) {
        console.error(`Font load failed: ${bubble.fontFamily} ${bubble.fontWeight}`, e);
      }
    }
  }
  resetFontCacheToken.set(true);
}

const localFontFiles: { [key: string]: string } = {
  '源暎アンチック': 'GenEiAntiqueNv5-M',
  '源暎エムゴ': 'GenEiMGothic2-Black',
  '源暎ぽっぷる': 'GenEiPOPle-Bk',
  '源暎ラテゴ': 'GenEiLateMinN_v2',
  '源暎ラテミン': 'GenEiLateMinN_v2',
  "ふい字": 'HuiFont29',
  "まきばフォント": 'MakibaFont13',
}

const cache = new Set<string>();

// キャッシュ機構(重複管理など)はFontFace APIが持っているので、基本的には余計なことはしなくてよい
// と思いきや一瞬ちらつくようなのでキャッシュする
async function load(family: string, weight: string): Promise<boolean> {
  if (cache.has(`${family}:${weight}`)) { return false; }

  const localFile = localFontFiles[family];
  console.log("load font", family, weight, localFile)
  if (localFile) {
    const url = `/fonts/${localFile}.woff2`;
    const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });
    await font.load();
    document.fonts.add(font);
  } else {
    await loadGoogleFontForCanvas(family, [weight]);
  }
  cache.add(`${family}:${weight}`);
  return true;
}
