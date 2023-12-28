import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";

// history処理では基本的にすべてdeep copyを使う

export type Prefix = 'shortcut-' | 'paste-' | 'drop-' | 'add-in-folder-' | 'shared-' | 'initial-' | 'gpt-build-' | 'weaved-';

export type Revision = {
  id: string;
  revision: number;
  prefix: Prefix;
}

export type Page = {
  frameTree: FrameElement,
  bubbles: Bubble[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
}

export type HistoryTag = 'bubble-text' | 'page-attribute' | null;

export type HistoryEntry = {
  pages: Page[];
  tag: HistoryTag;
}

export type History  = {
  entries: HistoryEntry[];
  cursor: number;
}

export type Book = {
  revision: Revision;
  pages: Page[];
  history: History;
}

export function incrementRevision(revision: Revision): void {
  revision.revision++;
}

export function revisionEqual(a: Revision, b: Revision): boolean {
  if (!a || !b) return false;
  return a.id === b.id && a.revision === b.revision;
}

export function addBookHistory(book: Book, tag: HistoryTag): void {
  const h = book.history;
  const i = h.entries.length = h.cursor;

  const newEntry: HistoryEntry = {
    pages: book.pages.map(clonePage),
    tag
  };

  if (0 < i && h.entries[i-1].tag != null && h.entries[i-1].tag === tag) {
    h.entries[i-1] = newEntry;
  } else {
    h.entries.push(newEntry);
  }
  console.tag("addHistory", "red", h.cursor, h.entries.length);
  h.cursor = h.entries.length;
}

export function undoBookHistory(book: Book): void {
  const h = book.history;
  console.tag("addHistory", "yellow", h.cursor, h.entries.length);
  if (h.cursor <= 1) { console.log("history head, skip undo"); return; }
  h.cursor--;
  // revertしないと実効はない
}

export function redoBookHistory(book: Book): void {
  const h = book.history;
  console.tag("addHistory", "yellow", h.cursor, h.entries.length);
  if (h.entries.length <= h.cursor) { console.log("history tail, skip redo"); return; }
  h.cursor++;
  // revertしないと実効はない
}

export function commitBook(book: Book, tag: HistoryTag): void {
  addBookHistory(book, tag);
  incrementRevision(book.revision);
}

export function revertBook(book: Book): void {
  const h = book.history;
  const i = h.cursor-1;
  const entry = h.entries[i];
  book.pages = entry.pages.map(clonePage);
  incrementRevision(book.revision);
}

export function newPage(frameTree: FrameElement) {
  const page: Page = {
    frameTree,
    bubbles:[], 
    paperSize: [840, 1188],
    paperColor: '#ffffff',
    frameColor: '#000000',
    frameWidth: 2,
  }
  return page;
}

export function newBook(id: string, prefix: Prefix, exampleIndex: number): Book {
  const frameTree = FrameElement.compile(frameExamples[exampleIndex]);
  const page = newPage(frameTree);
  const book = {
    revision: { id, revision:1, prefix },
    pages: [page],
    history: { entries: [], cursor: 0 },
  }
  commitBook(book, null);
  return book;
}

export function newImageBook(id: string, image: HTMLImageElement, prefix: Prefix): Book {
  const frameTree = FrameElement.compile(frameExamples[2]);
  frameTree.children[0].image = image;
  const page = newPage(frameTree);
  const book = {
    revision: { id, revision:1, prefix },
    pages: [page],
    history: { entries: [], cursor: 0 },
  }
  commitBook(book, null);
  return book;
}

export interface BookOperators {
  hint: (p: [number, number], s: String) => void;
  commit: (page: Page, tag: HistoryTag) => void;
  revert: (page: Page) => void;
  undo: (page: Page) => void;
  redo: (page: Page) => void;
  modalGenerate: (page: Page, frameElement: FrameElement) => void;
  modalScribble: (page: Page, frameElement: FrameElement) => void;
  insert: (page: Page, frameElement: FrameElement) => void;
  splice: (page: Page, frameElement: FrameElement) => void;
  focusBubble: (page: Page, bubble: Bubble, p: Vector) => void;
}

export function clonePage(page: Page): Page {
  return {
    frameTree: page.frameTree.clone(),
    bubbles: page.bubbles.map(b => b.clone()),
    paperSize: [...page.paperSize],
    paperColor: page.paperColor,
    frameColor: page.frameColor,
    frameWidth: page.frameWidth,
  }
}