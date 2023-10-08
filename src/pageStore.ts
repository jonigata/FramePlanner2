import { writable } from "svelte/store";
import type { Bubble } from './lib/layeredCanvas/bubble.js';
import { FrameElement } from './lib/layeredCanvas/frameTree.js';
import { frameExamples } from './lib/layeredCanvas/frameExamples.js';

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

export const mainPage = writable<Page>(
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
);

export function getRevision(page: Page): Revision {
  return {...page.revision};
}

export function setRevision(page: Page, revision: Revision) {
  page.revision = revision;
}

export function incrementRevision(revision: Revision): Revision {
  return {...revision, revision: revision.revision + 1};
}

export function getIncrementedRevision(page: Page): Revision {
  return incrementRevision(page.revision);
}

export function revisionEqual(a: Revision, b: Revision): boolean {
  if (!a || !b) return false;
  return a.id === b.id && a.revision === b.revision;
}

export function addHistory(page: Page, frameTree: FrameElement, bubbles: Bubble[], tag: string) {
  const i = page.history.length = page.historyIndex;
  const newEntry = {
    frameTree: frameTree.clone(),
    bubbles: bubbles.map(b => b.clone()),
    tag
  };

  if (0 < i &&
      page.history[i-1].tag != null &&
      page.history[i-1].tag === tag) {
    page.history[i-1] = newEntry;
  } else {
    page.history.push(newEntry);
  }
  console.log("page history length", page.history.length);
  page.historyIndex = page.history.length;
}

export function undoPageHistory(page) {
  console.log("undo", page.historyIndex);
  if (page.historyIndex <= 1) { return; }
  page.historyIndex--;
}

export function redoPageHistory(page) {
  console.log("redo", page.historyIndex);
  if (page.history.length <= page.historyIndex) { return; }
  page.historyIndex++;
}

export function commitPage(page: Page, frameTree: FrameElement, bubbles: Bubble[], tag: string) {
  const newPage = {...page, frameTree, bubbles};
  addHistory(newPage, frameTree, bubbles, tag);
  const pageRevision = getIncrementedRevision(newPage);
  setRevision(newPage, pageRevision);
  return newPage;
}

export function revertPage(page: Page) {
  console.log("revert", page.historyIndex);
  const h = page.history[page.historyIndex-1];
  const newPage = {...page};
  newPage.frameTree = h.frameTree.clone();
  newPage.bubbles = h.bubbles.map(b => b.clone());
  const pageRevision = getIncrementedRevision(newPage);
  setRevision(newPage, pageRevision);
  return newPage;
}
