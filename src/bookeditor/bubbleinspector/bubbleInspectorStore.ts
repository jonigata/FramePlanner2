import { type Writable, writable } from "svelte/store";
import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
import type { Film } from "../../lib/layeredCanvas/dataModels/film";
import type { Page } from '../book';

type BubbleInspectorCommand = "generate" | "scribble" | "punch";

export type BubbleInspectorPosition = {
  center: {x: number, y: number},
  height: number,
  offset: number,
}

export type BubbleInspectorTarget = {
  bubble: Bubble,
  page: Page,
  command: BubbleInspectorCommand,
  commandTargetFilm: Film,
}

export const bubbleInspectorTarget: Writable<BubbleInspectorTarget> = writable(null);
export const bubbleSplitCursor = writable(null);
export const bubbleInspectorRebuildToken: Writable<number> = writable(0);
