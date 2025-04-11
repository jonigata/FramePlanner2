import { ulid } from 'ulid';
import type { Bubble } from '../layeredCanvas/dataModels/bubble';
import { FrameElement, type Layout, type Border, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../layeredCanvas/dataModels/frameTree';
import { Film, FilmStack, FilmStackTransformer } from '../layeredCanvas/dataModels/film';
import { type Media, ImageMedia } from '../layeredCanvas/dataModels/media';
import { frameExamples } from '../layeredCanvas/tools/frameExamples';
import type { Rect, Vector } from "../layeredCanvas/tools/geometry/geometry";
import { isPointInTrapezoid, trapezoidBoundingRect } from "../layeredCanvas/tools/geometry/trapezoid";
import type { RichChatLog, ProtocolChatLog } from './types/richChat';
import { type CharacterBase, type NotebookBase } from "./types/notebook";
import type { Storyboard } from '$bookTypes/storyboard';

// history処理では基本的にすべてdeep copyを使う

export type Prefix = 'shortcut-' | 'paste-' | 'drop-' | 'add-in-folder-' | 'shared-' | 'initial-' | 'hiruma-' | 'weaved-' | 'envelope-';

// revision.idは以下の3つのうちどれか
// 1. "/" (ファイルシステムによっては異なる)
// 2. ulid
// 3. firebaseのpushId (シェアファイルの場合)

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
  source: any; // 一時的、Storyboard.Bubble
}

export type HistoryTag = 'bubble' | 'page-attribute' | "effect" | "notebook" | null;

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

export type BookAtributes = {
  publishUrl: string | null;
}

export type Book = {
  revision: Revision;
  pages: Page[];
  history: History;
  direction: ReadingDirection;
  wrapMode: WrapMode;
  chatLogs: RichChatLog[];
  notebook: NotebookLocal;
  attributes: BookAtributes;

  // 以下揮発性
  video?: VideoSettings;
}

export type SerializedPage = {
  id: string,
  frameTree: any,
  bubbles: any[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
}

export type SerializedBookAttributes = {
  publishUrl: string | null,
}

export type SerializedCharacter = {
  name: string;
  personality: string;
  appearance: string;
  themeColor: string;
  ulid: string;
  portrait: string | null;
}

export type SerializedNotebook = {
  theme: string;
  characters: SerializedCharacter[];
  plot: string;
  scenario: string;
  storyboard: Storyboard | null;
  critique: string;
  pageNumber: number | null;
  format: '4koma' | 'standard' | null;
}

export type SerializedBook = {
  revision: {id: string, revision: number, prefix: Prefix},
  pages: SerializedPage[],
  direction: ReadingDirection,
  wrapMode: WrapMode,
  chatLogs: ProtocolChatLog[],
  notebook: SerializedNotebook | null,
  attributes: SerializedBookAttributes,
}

export interface CharacterLocal extends CharacterBase {
  portrait: 'loading' | Media | null;
}

export type CharactersLocal = CharactersLocal[];

export interface NotebookLocal extends NotebookBase {
  characters: CharacterLocal[];
};

export function emptyNotebook(): NotebookLocal {
  return {
    theme: "",
    characters: [],
    plot: "",
    scenario: "",
    critique: "",
    storyboard: null,
    pageNumber: null,
    format: "standard",
  };
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
  h.cursor = h.entries.length;
}

export function undoBookHistory(book: Book): void {
  const h = book.history;
  if (h.cursor <= 1) { console.log("history head, skip undo"); return; }
  h.cursor--;
  // revertしないと実効はない
}

export function redoBookHistory(book: Book): void {
  const h = book.history;
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

export function newPage(frameTree: FrameElement, bubbles: Bubble[]) {
  const page: Page = {
    id: ulid(),
    frameTree,
    bubbles, 
    paperSize: [840, 1188],
    paperColor: '#ffffff',
    frameColor: '#000000',
    frameWidth: 2,
    source: null,
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
    notebook: emptyNotebook(),
    attributes: { publishUrl: null },
  }
  commitBook(book, null);
  return book;
}

export function newImageBook(id: string, canvas: HTMLCanvasElement, prefix: Prefix): Book {
  const frameTree = FrameElement.compile(frameExamples[2].frameTree);
  const film = new Film(new ImageMedia(canvas));
  frameTree.children[0].filmStack.films = [film];

  const page = newPage(frameTree, []);
  page.paperSize = [canvas.width, canvas.height];
  const book: Book = {
    revision: { id, revision:1, prefix },
    pages: [page],
    history: { entries: [], cursor: 0 },
    direction: 'right-to-left',
    wrapMode: 'none',
    chatLogs: [],
    notebook: emptyNotebook(),
    attributes: { publishUrl: null },
  }
  commitBook(book, null);
  return book;
}

export interface BookOperators {
  hint: (r: [number, number, number, number], s: string | null) => void;
  commit: (tag: HistoryTag) => void;
  forceDelayedCommit(): void;
  cancelDelayedCommit(): void;
  revert: () => void;
  undo: () => void;
  redo: () => void;
  shift: (page: Page, frameElement: FrameElement) => void;
  unshift: (page: Page, frameElement: FrameElement) => void;
  swap: (page: Page, frameElement0: FrameElement, frameElement1: FrameElement) => void;
  insert: (page: Page, border: Border) => void;
  focusFrame: (page: Page, frame: FrameElement | null, p: Vector | null) => void;
  focusBubble: (page: Page, bubble: Bubble | null) => void;
  viewportChanged: () => void;
  insertPage: (index: number) => void;
  deletePage: (index: number) => void;
  movePages: (from: number[], to: number) => void;
  duplicatePages: (from: number[], to: number) => void;
  rescueResidual: (media: HTMLCanvasElement | HTMLVideoElement | string) => void;
  copyPageToClipboard: (index: number) => void;
  batchImaging: (index: number) => void;
  editBubbles: (index: number) => void;
  tweak: (index: number) => void;
  chase: () => void;
  getMarks: () => boolean[];
  setMarks: (marks: boolean[]) => void;
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
    source: page.source,
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
    notebook: { ...book.notebook, characters: book.notebook.characters.map(c => ({ ...c })) },
    attributes: { ...book.attributes },
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

export function collectPageContents(page: Page, pageNumber: number, dir: ReadingDirection): FrameSequence {
  const layout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  const bubbles = [...page.bubbles];
  return collectFrameContents(page, pageNumber, page.frameTree, layout, bubbles, dir);
}

function collectFrameContents(page: Page, pageNumber: number, frameTree: FrameElement, pageLayout: Layout, bubbles: Bubble[], dir: ReadingDirection): FrameSequence {
  const slots: FrameSlot[] = [];
  const contents: FrameContent[] = [];
  if (frameTree.isLeaf()) {
    if (frameTree.isAuthentic()) {
      const layout = findLayoutOf(pageLayout, frameTree)!;

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
      const i = dir === 'left-to-right' && frameTree.direction == 'h' ? frameTree.children.length - ii - 1 : ii;
      const child = frameTree.children[i];
      const { slots: l, contents: c } = collectFrameContents(page, pageNumber, child, pageLayout, bubbles, dir);
      slots.push(...l);
      contents.push(...c);
    }
  }
  return { slots, contents };
}

export function dealBookContents(seq: FrameSequence, insertElement: FrameElement | null, spliceElement: FrameElement | null): void {
  dealPageContents(seq, insertElement, spliceElement);
}

function dealPageContents(seq: FrameSequence, insertElement: FrameElement | null, spliceElement: FrameElement | null): void {
  dealFrameContents(seq, insertElement, spliceElement, false);
} 

function dealFrameContents(seq: FrameSequence, insertElement: FrameElement | null, spliceElement: FrameElement | null, tailMode: boolean) {
  const { slots, contents } = seq;

  if (slots.length === 0) return;
  const slot = slots.shift()!;
  const layout = slot.layout;
  const frameTree = layout.element;

  if (frameTree === spliceElement) {
    tailMode = true;
    contents.shift();
  } 
  if (frameTree === insertElement || contents.length === 0) {
    tailMode = true;
    frameTree!.filmStack = new FilmStack();
    frameTree!.prompt = "";
  } else {
    const [sx, sy, sw, sh] = contents[0].sourceRect;
    const [tx, ty, tw, th] = trapezoidBoundingRect(layout.corners);

    const content = contents.shift()!;
    frameTree.filmStack = new FilmStack();
    frameTree.filmStack.films = [...content.filmStack.films];
    frameTree.prompt = content.prompt;

    for (let b of content.bubbles) {
      b.pageNumber = slot.pageNumber;
      if (slot.page !== content.sourcePage) {
        content.sourcePage.bubbles.splice(content.sourcePage.bubbles.findIndex(e => e === b), 1);
        slot.page.bubbles.push(b);
      }
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

  let slot0: FrameSlot | null = null;
  let content0: FrameContent | null = null;
  let slot1: FrameSlot | null = null;
  let content1: FrameContent | null = null;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const layout = slot.layout;
    const frameTree = layout.element;
    if (frameTree === frameElement0) {
      slot0 = slot;
      content0 = contents[i];
    } else if (frameTree === frameElement1) {
      slot1 = slot;
      content1 = contents[i];
    }
  }

  if (!slot0 || !slot1) {
    console.log("swapBookContents: not found");
    return;
  }

  const element0 = slot0.layout.element;
  const element1 = slot1.layout.element;

  const swapFilmStack = element0.filmStack;
  element0.filmStack = element1.filmStack;
  element1.filmStack = swapFilmStack;

  const swapPrompt = element0.prompt;
  element0.prompt = element1.prompt;
  element1.prompt = swapPrompt;

  function fitFilms(paperSize: Vector, layout: Layout): void {
    const transformer = new FilmStackTransformer(paperSize, layout.element.filmStack.films);
    transformer.scale(0.01);
    constraintLeaf(paperSize, layout);
  }
  fitFilms(slot0.page.paperSize, slot0.layout);
  fitFilms(slot1.page.paperSize, slot1.layout);

  function alignBubbles(targetSlot: FrameSlot, sourceContent: FrameContent) {
    const [sx, sy, sw, sh] = sourceContent.sourceRect;
    const [tx, ty, tw, th] = trapezoidBoundingRect(targetSlot.layout.corners);

    for (let b of sourceContent.bubbles) {
      b.pageNumber = targetSlot.pageNumber;
      if (targetSlot.page !== sourceContent.sourcePage) {
        const sourceBubbles = sourceContent.sourcePage.bubbles;
        sourceBubbles.splice(sourceBubbles.findIndex(e => e === b), 1);
        targetSlot.page.bubbles.push(b);
      }

      const bc = b.getPhysicalCenter(sourceContent.sourcePage.paperSize);
      const cc: Vector = [
        tx + tw * (bc[0] - sx) / sw,
        ty + th * (bc[1] - sy) / sh,
      ];
      b.setPhysicalCenter(targetSlot.page.paperSize, cc);
    }
  }
  alignBubbles(slot0, content1!);
  alignBubbles(slot1, content0!);
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
