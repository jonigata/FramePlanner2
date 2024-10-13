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
  command: BubbleInspectorCommand | null,
  commandTargetFilm: Film | null,
}

export const bubbleInspectorTarget: Writable<BubbleInspectorTarget | null> = writable(null);
export const bubbleSplitCursor: Writable<number | null> = writable(null);
export const bubbleInspectorRebuildToken: Writable<number> = writable(0);
