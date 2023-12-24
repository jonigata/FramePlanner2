import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";
import type { Book, BookOperators } from './book';

/*
export const paperTemplate = writable(null);
export const saveToken = writable(null);
export const clipboardToken = writable(false);
export const scale = writable(1);
export const redrawToken = writable(false);
*/

export const mainBook = writable<Book>(
  {
    id: "bootstrap",
    pages: [
      {
        revision: { id: "bootstrap", revision: 1, prefix: "bootstrap" },
        frameTree: FrameElement.compile(frameExamples[0]),
        bubbles: [],
        paperSize: [840, 1188],
        paperColor: '#ffffff',
        frameColor: '#000000',
        frameWidth: 2,
        desktopPosition: [0, 0],
        history: [],
        historyIndex: 0,
      }
    ]
  }
);

export const mainPage = derived(mainBook, $mainBook => $mainBook.pages[0]);
export const viewport: Writable<Viewport> = writable(null);
export const bookEditor: Writable<BookOperators> = writable(null);
