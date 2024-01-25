import { type Writable, writable } from "svelte/store";
import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
import type { Page } from '../book';

export type BubbleInspectorPosition = {
  center: {x: number, y: number},
  height: number,
  offset: number,
}

export type BubbleInspectorTarget = {
  bubble: Bubble,
  page: Page,
}

export const bubbleInspectorTarget: Writable<BubbleInspectorTarget> = writable(null);
export const bubbleInspectorPosition: Writable<BubbleInspectorPosition> = writable(null);
export const bubbleSplitCursor = writable(null);
