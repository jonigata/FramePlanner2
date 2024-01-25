import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import { FrameElement, type Layout, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import type { ImageFile } from "../lib/layeredCanvas/dataModels/imageFile";
import { isPointInTrapezoid, trapezoidBoundingRect } from "../lib/layeredCanvas/tools/geometry/trapezoid";
import { ulid } from 'ulid';

// history処理では基本的にすべてdeep copyを使う

export type Prefix = 'shortcut-' | 'paste-' | 'drop-' | 'add-in-folder-' | 'shared-' | 'initial-' | 'gpt-build-' | 'weaved-';

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
  console.tag("commitBook", "orange");
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

export function newPage(frameTree: FrameElement) {
  const page: Page = {
    id: ulid(),
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
  commit: (tag: HistoryTag) => void;
  revert: () => void;
  undo: () => void;
  redo: () => void;
  modalGenerate: (page: Page, frameElement: FrameElement) => void;
  modalScribble: (page: Page, frameElement: FrameElement) => void;
  insert: (page: Page, frameElement: FrameElement) => void;
  splice: (page: Page, frameElement: FrameElement) => void;
  focusBubble: (page: Page, bubble: Bubble, p: Vector) => void;
  viewportChanged: () => void;
  insertPage: (index: number) => void;
  deletePage: (index: number) => void;
  chase: () => void;
}

export function clonePage(page: Page): Page {
  return {
    id: ulid(),
    frameTree: page.frameTree.clone(),
    bubbles: page.bubbles.map(b => b.clone()),
    paperSize: [...page.paperSize],
    paperColor: page.paperColor,
    frameColor: page.frameColor,
    frameWidth: page.frameWidth,
  }
}

export type FrameContent = {
  image: ImageFile,
  translation: Vector,
  scale: Vector,
  rotation: number,
  bubbles: Bubble[], // ただしpositionはコマ正規化座標
}

export function collectBookContents(book: Book): FrameContent[] {
  const contents: FrameContent[] = [];
  for (const page of book.pages) {
    contents.push(...collectPageContents(page));
  }
  return contents;
}

function collectPageContents(page: Page): FrameContent[] {
  const layout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  return collectFrameContents(page, page.frameTree, layout);
}

function collectFrameContents(page: Page, frameTree: FrameElement, layout: Layout): FrameContent[] {
  const contents: FrameContent[] = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility) {
      const leafLayout = findLayoutOf(layout, frameTree);
      const r = trapezoidBoundingRect(leafLayout.corners);
      const [w, h] = [r[2] - r[0], r[3] - r[1]];

      // centerがtrapezoidに含まれるbubbleを抽出
      const selected: Bubble[] = [];
      const unselected: Bubble[] = [];  
      for (let b of page.bubbles) {
        const bc = b.getPhysicalCenter(page.paperSize);
        if (isPointInTrapezoid(bc, leafLayout.corners)) {
          selected.push(b);
        } else {
          unselected.push(b);
        }
      }
      page.bubbles = unselected;

      contents.push({
        image: frameTree.image,
        translation: frameTree.translation,
        scale: frameTree.scale,
        rotation: frameTree.rotation,
        bubbles: selected,
      });
    }
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      const child = frameTree.children[i];
      contents.push(...collectFrameContents(page, child, layout));
    }
  }
  return contents;  
}

export function dealBookContents(book: Book, contents: FrameContent[], insertElement: FrameElement, spliceElement: FrameElement): void {
  let pageNumber = 0;
  for (const page of book.pages) {
    dealPageContents(book, page, contents, insertElement, spliceElement, pageNumber);
    pageNumber++;
  }
}

function dealPageContents(book: Book, page: Page, contents: FrameContent[], insertElement: FrameElement, spliceElement: FrameElement, pageNumber: number): void {
  const layout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  dealFrameContents(book, page, page.frameTree, layout, contents, insertElement, spliceElement, pageNumber);
} 

function dealFrameContents(book: Book, page: Page, frameTree: FrameElement, layout: Layout, contents: FrameContent[], insertElement: FrameElement, spliceElement: FrameElement, pageNumber: number): void {
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility) {

      if (frameTree === spliceElement) {
        contents.shift();
      } 
      if (frameTree === insertElement || contents.length === 0) {
        frameTree.image = null;
        frameTree.translation = [0, 0];
        frameTree.scale = [1, 1];
        frameTree.rotation = 0;
        return;
      }
    
      const leafLayout = findLayoutOf(layout, frameTree);
      const r = trapezoidBoundingRect(leafLayout.corners);
      const [w, h] = [r[2] - r[0], r[3] - r[1]];

      const content = contents.shift();
      frameTree.image = content.image;
      frameTree.translation = content.translation;
      frameTree.scale = content.scale;
      frameTree.rotation = content.rotation;

      for (let b of content.bubbles) {
        b.pageNumber = pageNumber;
        page.bubbles.push(b);
      }

      constraintLeaf(leafLayout);
    }
  } else {
    for (let child of frameTree.children) {
      dealFrameContents(book, page, child, layout, contents, insertElement, spliceElement, pageNumber);
    }
  }
}
