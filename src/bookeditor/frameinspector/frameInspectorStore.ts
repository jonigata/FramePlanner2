import { type Writable, writable } from "svelte/store";
import type { FrameElement } from "../../lib/layeredCanvas/dataModels/frameTree";
import type { Film } from "../../lib/layeredCanvas/dataModels/film";
import type { Page } from '../book';

type FrameInspectorCommand = "generate" | "scribble" | "punch" | "commit";

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
