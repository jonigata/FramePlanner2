import { type Writable, writable } from "svelte/store";

export type BubbleInspectorPosition = {
  center: {x: number, y: number},
  height: number,
  offset: number,
}

export const bubble = writable(null);
export const bubbleInspectorPosition: Writable<BubbleInspectorPosition> = writable(null);
export const bubbleSplitCursor = writable(null);
