import { type RichFragment } from "./richText";

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderingText {
  height: number;
  width: number;
  verticalLines?: RichFragment[][];
  horizontalLines?: { text: string }[];
}

export type DrawMethod = "fill" | "stroke";
