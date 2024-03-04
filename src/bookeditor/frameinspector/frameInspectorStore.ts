import { type Writable, writable } from "svelte/store";
import type { Film, FrameElement } from "../../lib/layeredCanvas/dataModels/frameTree";
import type { Page } from '../book';

type FrameInspectorCommand = "generate" | "scribble";

export type FrameInspectorPosition = {
  center: {x: number, y: number},
  height: number,
  offset: number,
}

export type FrameInspectorTarget = {
  frame: FrameElement,
  page: Page,
  command: FrameInspectorCommand,
  commandTargetFilm: Film,
}

export const frameInspectorTarget: Writable<FrameInspectorTarget> = writable(null);
export const frameInspectorPosition: Writable<FrameInspectorPosition> = writable(null);
