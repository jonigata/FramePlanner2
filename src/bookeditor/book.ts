import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import { FrameElement, type Layout, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Film, FilmStack, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import type { Rect, Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { isPointInTrapezoid, trapezoidBoundingRect } from "../lib/layeredCanvas/tools/geometry/trapezoid";
import { ulid } from 'ulid';
import type { RichChatLog } from '../utils/richChat';

// history処理では基本的にすべてdeep copyを使う

export type Prefix = 'shortcut-' | 'paste-' | 'drop-' | 'add-in-folder-' | 'shared-' | 'initial-' | 'hiruma-' | 'weaved-';

export type Revision = {
  id: string;
  revision: number;
  prefix: Prefix;
}

export type Page = {
  id: string;
  frameTree: FrameElement,
  bubbles: Bubble[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
}

export type HistoryTag = 'bubble' | 'page-attribute' | null;

export type HistoryWeight = "light" | "heavy";

export type HistoryEntry = {
  pages: Page[];
  tag: HistoryTag;
}

export type History  = {
  entries: HistoryEntry[];
  cursor: number;
}

export type ReadingDirection = 'left-to-right' | 'right-to-left';
export type WrapMode = 'none' | 'two-pages' | 'one-page';

export type VideoSettings = {
  width: number;
  height: number;
  moveDuration: number;
  standardWait: number;
  standardScale: number;
}

export type Book = {
  revision: Revision;
  pages: Page[];
  history: History;
  direction: ReadingDirection;
  wrapMode: WrapMode;
  chatLogs: RichChatLog[];

  // 以下揮発性
  video?: VideoSettings;
}

export function incrementRevision(revision: Revision): void {
  revision.revision++;
}

export function revisionEqual(a: Revision, b: Revision): boolean {
  if (!a || !b) return false;
  return a.id === b.id && a.revision === b.revision;
}

export function getHistoryWeight(book: Book): HistoryWeight {
  const h = book.history;
  const i = h.cursor;
  return h.entries[i-1].tag == null ? 'heavy' : 'light';
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
  console.tag("addBookHistory", "purple", h.cursor, h.entries.length);
  h.cursor = h.entries.length;
}

export function undoBookHistory(book: Book): void {
  const h = book.history;
  console.tag("undoBookHistory", "green", h.cursor, h.entries.length);
  if (h.cursor <= 1) { console.log("history head, skip undo"); return; }
  h.cursor--;
  // revertしないと実効はない
}

export function redoBookHistory(book: Book): void {
  const h = book.history;
  console.tag("redoBookHistory", "green", h.cursor, h.entries.length);
  if (h.entries.length <= h.cursor) { console.log("history tail, skip redo"); return; }
  h.cursor++;
  // revertしないと実効はない
}

export function commitBook(book: Book, tag: HistoryTag): void {
  console.tag("commitBook", "orange", tag);
  addBookHistory(book, tag);
  incrementRevision(book.revision);
}

export function revertBook(book: Book): void {
  console.tag("revertBook", "orange");
  const h = book.history;
  const i = h.cursor-1;
  const entry = h.entries[i];
  book.pages = entry.pages.map(clonePage);
  incrementRevision(book.revision);
}

export function newPage(frameTree: FrameElement, bubbles: Bubble[]) {
  const page: Page = {
    id: ulid(),
    frameTree,
    bubbles, 
    paperSize: [840, 1188],
    paperColor: '#ffffff',
    frameColor: '#000000',
    frameWidth: 2,
  }
  return page;
}

export function newBook(id: string, prefix: Prefix, exampleIndex: number): Book {
  const example = frameExamples[exampleIndex];
  const frameTree = FrameElement.compile(example.frameTree);
  const page = newPage(frameTree, []);
  const book: Book = {
    revision: { id, revision:1, prefix },
    pages: [page],
    history: { entries: [], cursor: 0 },
    direction: 'right-to-left',
    wrapMode: 'two-pages',
    chatLogs: [],
  }
  commitBook(book, null);
  return book;
}

export function newImageBook(id: string, canvas: HTMLCanvasElement, prefix: Prefix): Book {
  const frameTree = FrameElement.compile(frameExamples[2].frameTree);
  const film = new Film();
  film.media = new ImageMedia(canvas);
  frameTree.children[0].filmStack.films = [film];

  const page = newPage(frameTree, []);
  page.paperSize = [canvas.width, canvas.height];
  const book: Book = {
    revision: { id, revision:1, prefix },
    pages: [page],
    history: { entries: [], cursor: 0 },
    direction: 'right-to-left',
    wrapMode: 'one-page',
    chatLogs: [],
  }
  commitBook(book, null);
  return book;
}

export interface BookOperators {
  hint: (r: [number, number, number, number], s: String) => void;
  commit: (tag: HistoryTag) => void;
  revert: () => void;
  undo: () => void;
  redo: () => void;
  insert: (page: Page, frameElement: FrameElement) => void;
  splice: (page: Page, frameElement: FrameElement) => void;
  swap: (page: Page, frameElement0: FrameElement, frameElement1: FrameElement) => void;
  focusFrame: (page: Page, frame: FrameElement, p: Vector) => void;
  focusBubble: (page: Page, bubble: Bubble) => void;
  viewportChanged: () => void;
  insertPage: (index: number) => void;
  deletePage: (index: number) => void;
  movePages: (from: number[], to: number) => void;
  copyPageToClipboard: (index: number) => void;
  batchImaging: (index: number) => void;
  editBubbles: (index: number) => void;
  tweak: (index: number) => void;
  chase: () => void;
  getMarks: () => boolean[];
  getFocusedPage: () => Page;
}

export function clonePage(page: Page): Page {
  return {
    id: ulid(),
    frameTree: page.frameTree.clone(),
    bubbles: page.bubbles.map(b => b.clone(true)),
    paperSize: [...page.paperSize],
    paperColor: page.paperColor,
    frameColor: page.frameColor,
    frameWidth: page.frameWidth,
  }
}

export function cloneBook(book: Book): Book {
  return {
    revision: { ...book.revision },
    pages: book.pages.map(clonePage),
    history: { entries: book.history.entries.map(e => ({ ...e })), cursor: book.history.cursor },
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: book.chatLogs.map(l => ({ ...l })),
  };
}

export type FrameContent = {
  sourcePage: Page,
  sourceRect: Rect, // 元のコマのtrapezoidBoudingRect
  filmStack: FilmStack,
  bubbles: Bubble[], // ただしpositionはコマ正規化座標
  prompt: string | null,
}

export type FrameSlot = {
  layout: Layout,
  page: Page,
  pageNumber: number,
}

export type FrameSequence = {
  slots: FrameSlot[],
  contents: FrameContent[],
}

export function collectBookContents(book: Book): FrameSequence {
  const slots: FrameSlot[] = [];
  const contents: FrameContent[] = [];
  let pageNumber = 0;
  for (const page of book.pages) {
    const { slots: l, contents: c } = collectPageContents(page, pageNumber, book.direction);
    slots.push(...l);
    contents.push(...c);
    pageNumber++;
  }
  return { slots, contents };
}

function collectPageContents(page: Page, pageNumber: number, dir: ReadingDirection): FrameSequence {
  const layout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  const bubbles = [...page.bubbles];
  return collectFrameContents(page, pageNumber, page.frameTree, layout, bubbles, dir);
}

function collectFrameContents(page: Page, pageNumber: number, frameTree: FrameElement, pageLayout: Layout, bubbles: Bubble[], dir: ReadingDirection): FrameSequence {
  const slots: FrameSlot[] = [];
  const contents: FrameContent[] = [];
  if (frameTree.isLeaf()) {
    if (frameTree.isAuthentic()) {
      const layout = findLayoutOf(pageLayout, frameTree);

      // centerがtrapezoidに含まれるbubbleを抽出
      const selected: Bubble[] = [];
      const unselected: Bubble[] = [];
      for (let b of bubbles) {
        const bc = b.getPhysicalCenter(page.paperSize);
        if (isPointInTrapezoid(bc, layout.corners)) {
          selected.push(b);
        } else {
          unselected.push(b);
        }
      }
      bubbles.splice(0, bubbles.length, ...unselected)

      slots.push({ layout, page, pageNumber });
      contents.push({
        sourcePage: page,
        sourceRect: trapezoidBoundingRect(layout.corners),
        filmStack: frameTree.filmStack,
        bubbles: selected,
        prompt: frameTree.prompt,
      });
    }
  } else {
    for (let ii = 0; ii < frameTree.children.length; ii++) {
      console.log(dir);
      const i = dir === 'left-to-right' && frameTree.direction == 'h' ? frameTree.children.length - ii - 1 : ii;
      const child = frameTree.children[i];
      const { slots: l, contents: c } = collectFrameContents(page, pageNumber, child, pageLayout, bubbles, dir);
      slots.push(...l);
      contents.push(...c);
    }
  }
  return { slots, contents };
}

export function dealBookContents(seq: FrameSequence, insertElement: FrameElement, spliceElement: FrameElement): void {
  dealPageContents(seq, insertElement, spliceElement);
}

function dealPageContents(seq: FrameSequence, insertElement: FrameElement, spliceElement: FrameElement): void {
  dealFrameContents(seq, insertElement, spliceElement, false);
} 

function dealFrameContents(seq: FrameSequence, insertElement: FrameElement, spliceElement: FrameElement, tailMode: boolean) {
  const { slots, contents } = seq;

  if (slots.length === 0) return;
  const slot = slots.shift();
  const layout = slot.layout;
  const frameTree = layout.element;

  if (frameTree === spliceElement) {
    tailMode = true;
    contents.shift();
  } 
  if (frameTree === insertElement || contents.length === 0) {
    tailMode = true;
    frameTree.filmStack = new FilmStack();
    frameTree.prompt = "";
  } else {
    const [sx, sy, sw, sh] = contents[0].sourceRect;
    const [tx, ty, tw, th] = trapezoidBoundingRect(layout.corners);

    const content = contents.shift();
    frameTree.filmStack = new FilmStack();
    frameTree.filmStack.films = [...content.filmStack.films];
    frameTree.prompt = content.prompt;

    for (let b of content.bubbles) {
      b.pageNumber = slot.pageNumber;
      const bc = b.getPhysicalCenter(content.sourcePage.paperSize);
      const cc: Vector = [
        tx + tw * (bc[0] - sx) / sw,
        ty + th * (bc[1] - sy) / sh,
      ];
      b.setPhysicalCenter(slot.page.paperSize, cc);
    }
  }

  if (tailMode) {
    const transformer = new FilmStackTransformer(slot.page.paperSize, frameTree.filmStack.films);
    transformer.scale(0.01);
    constraintLeaf(slot.page.paperSize, layout);
  }

  dealFrameContents({ slots, contents }, insertElement, spliceElement, tailMode);
}

export function swapBookContents(seq: FrameSequence, frameElement0: FrameElement, frameElement1: FrameElement): void {
  const { slots, contents } = seq;

  let content0 = null;
  let content1 = null;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const layout = slot.layout;
    const frameTree = layout.element;
    if (frameTree === frameElement0) {
      content0 = contents[i];
    } else if (frameTree === frameElement1) {
      content1 = contents[i];
    }
  }

  for (let i = 0; i < seq.slots.length; i++) {
    const slot = slots[i];
    const layout = slot.layout;
    const frameTree = layout.element;
    const content = contents[i];
    let swapContent = null;
    if (frameTree === frameElement0) {
      swapContent = content1;
    } else if (frameTree === frameElement1) {
      swapContent = content0;
    }
    if (swapContent == null) { 
      content.sourcePage.bubbles.push(...content.bubbles);
      continue; 
    }

    frameTree.filmStack = new FilmStack();
    frameTree.filmStack.films = [...swapContent.filmStack.films];
    frameTree.prompt = swapContent.prompt;

    const transformer = new FilmStackTransformer(slot.page.paperSize, frameTree.filmStack.films);
    transformer.scale(0.01);
    constraintLeaf(slot.page.paperSize, layout);

    const [sx, sy, sw, sh] = swapContent.sourceRect;
    const [tx, ty, tw, th] = trapezoidBoundingRect(layout.corners);
    console.log([sx, sy, sw, sh], [tx, ty, tw, th]);
    for (let b of swapContent.bubbles) {
      b.pageNumber = slot.pageNumber;
      const bc = b.getPhysicalCenter(swapContent.sourcePage.paperSize);
      const cc: Vector = [
        tx + tw * (bc[0] - sx) / sw,
        ty + th * (bc[1] - sy) / sh,
      ];
      console.log(bc, cc, slot.page.paperSize);
      b.setPhysicalCenter(slot.page.paperSize, cc);
    }
    content.sourcePage.bubbles.push(...swapContent.bubbles);
  }
}

export function collectAllFilms(book: Book): Film[] {
  const films: Film[] = [];
  for (let page of book.pages) {
    collectPageFilms(page, films);
    collectBubbleFilms(page.bubbles, films);
  }
  return films;
} 

function collectPageFilms(page: Page, films: Film[]): void {
  collectFrameFilms(page.frameTree, films);
}

function collectFrameFilms(frameTree: FrameElement, films: Film[]): void {
  if (frameTree.isLeaf()) {
    if (frameTree.isAuthentic()) {
      films.push(...frameTree.filmStack.films);
    }
  } else {
    for (let child of frameTree.children) {
      collectFrameFilms(child, films);
    }
  }
}

function collectBubbleFilms(bubbles: Bubble[], films: Film[]): void {
  for (let b of bubbles) {
    films.push(...b.filmStack.films);
  }
}