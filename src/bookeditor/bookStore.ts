import { type Writable, writable, derived } from "svelte/store";
import type { Viewport } from "../lib/layeredCanvas/system/layeredCanvas";
import type { Book, BookOperators } from './book';

export const mainBook = writable<Book>(null);
export const mainPage = derived(mainBook, $mainBook => $mainBook?.pages[0]);
export const viewport: Writable<Viewport> = writable(null);
export const bookEditor: Writable<BookOperators> = writable(null);
