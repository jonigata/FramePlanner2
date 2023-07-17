import { writable } from "svelte/store";
import type { Bubble } from './lib/layeredCanvas/bubble.js';
import { FrameElement } from './lib/layeredCanvas/frameTree.js';
import { ulid } from "ulid";
import { frameExamples } from './lib/layeredCanvas/frameExamples.js';

export type Revision = {
  id: string;
  revision: number;
}

export type Page = {
  revision: Revision;
  frameTree: FrameElement,
  bubbles: Bubble[],
  paperSize: [number, number],
  paperColor: string,
  frameColor: string,
  frameWidth: number,
}

export const mainPage = writable<Page>(
  {
    revision: newRevision(),
    frameTree: FrameElement.compile(frameExamples[2]),
    bubbles: [],
    paperSize: [840, 1188],
    paperColor: '#ffffff',
    frameColor: '#000000',
    frameWidth: 2,
  }
);

export function newRevision(): Revision {
  return {id: ulid(), revision: 1};
}

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
