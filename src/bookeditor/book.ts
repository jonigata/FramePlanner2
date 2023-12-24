import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";

export type Revision = {
  id: string;
  revision: number;
  prefix: string;
}

export type HistoryEntry = {
  frameTree: FrameElement;
  bubbles: Bubble[];
  tag: string;
}

export type Page = {
  revision: Revision;
  frameTree: FrameElement,
  bubbles: Bubble[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
  desktopPosition?: [number, number],
  history: HistoryEntry[],
  historyIndex: number;
}

export type Book = {
  id: string;
  pages: Page[];
}

export function incrementRevision(revision: Revision): void {
  revision.revision++;
}

export function revisionEqual(a: Revision, b: Revision): boolean {
  if (!a || !b) return false;
  return a.id === b.id && a.revision === b.revision;
}

export function addHistory(page: Page, tag: string): void {
  const i = page.history.length = page.historyIndex;
  const newEntry = {
    frameTree: page.frameTree.clone(),
    bubbles: page.bubbles.map(b => b.clone()),
    tag
  };

  if (0 < i &&
      page.history[i-1].tag != null &&
      page.history[i-1].tag === tag) {
    page.history[i-1] = newEntry;
  } else {
    page.history.push(newEntry);
  }
  page.historyIndex = page.history.length;
  console.tag("addHistory", "red", page.historyIndex, page.history.length);
}

export function undoPageHistory(page: Page): void {
  console.log("undo", page.historyIndex);
  if (page.historyIndex <= 1) { return; }
  page.historyIndex--;
}

export function redoPageHistory(page: Page): void {
  console.log("redo", page.historyIndex, page.history.length);
  if (page.history.length <= page.historyIndex) { return; }
  page.historyIndex++;
}

export function commitPage(page: Page, tag: string): void {
  addHistory(page, tag);
  incrementRevision(page.revision);
}

export function revertPage(page: Page): void {
  const h = page.history[page.historyIndex-1];
  page.frameTree = h.frameTree.clone();
  page.bubbles = h.bubbles.map(b => b.clone());
  incrementRevision(page.revision);
}

function newPageAux(frameTree: FrameElement, prefix: string, index: number) {
  const page: Page = {
    revision: {id: "new page", revision:1, prefix },
    frameTree,
    bubbles:[], 
    paperSize: [840, 1188],
    paperColor: '#ffffff',
    frameColor: '#000000',
    frameWidth: 2,
    desktopPosition: [0, 0],
    history: [{frameTree: frameTree.clone(), bubbles:[], tag: null}],
    historyIndex: 1,
  }
  return page;
}

export function newPage(prefix: string, index: number = 2) {
  const frameTree = FrameElement.compile(frameExamples[index]);
  return newPageAux(frameTree, prefix, index);
}

export function newImagePage(image: HTMLImageElement, prefix: string): Page {
  const frameTree = FrameElement.compile(frameExamples[2]);
  frameTree.children[0].image = image;
  const page = newPageAux(frameTree, prefix, 2)
  page.paperSize = [image.naturalWidth, image.naturalHeight];
  return page;
}

export interface BookOperators {
  hint: (p: [number, number], s: String) => void;
  commit: (page: Page, tag: string) => void;
  revert: (page: Page) => void;
  undo: (page: Page) => void;
  redo: (page: Page) => void;
  modalGenerate: (page: Page, frameElement: FrameElement) => void;
  modalScribble: (page: Page, frameElement: FrameElement) => void;
  insert: (page: Page, frameElement: FrameElement) => void;
  splice: (page: Page, frameElement: FrameElement) => void;
  focusBubble: (page: Page, bubble: Bubble, p: Vector) => void;
}

