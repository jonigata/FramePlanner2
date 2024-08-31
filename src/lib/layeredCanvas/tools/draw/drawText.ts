import { drawVerticalText, measureVerticalText } from "./verticalText";
import { kinsoku } from "../kinsoku";
import type { Rectangle, RenderingText, DrawMethod } from "./typeSetting";

export { drawVerticalText, measureVerticalText };

export type Direction = "v" | "h";

export function drawText(
  dir: Direction,
  ctx: CanvasRenderingContext2D,
  method: DrawMethod,
  r: Rectangle,
  text: string,
  baselineSkip: number,
  charSkip: number,
  rubySize: number,
  rubyDistance: number,
  m?: RenderingText,
  autoNewline?: boolean
): void {
  if (dir === 'v') {
    drawVerticalText(ctx, method, r, text, baselineSkip, charSkip, rubySize, rubyDistance, m, autoNewline);
  } else {
    drawHorizontalText(ctx, method, r, text, baselineSkip, charSkip, m, autoNewline);
  }
}

export function drawHorizontalText(
  context: CanvasRenderingContext2D,
  method: DrawMethod,
  r: Rectangle,
  text: string,
  baselineSkip: number,
  charSkip: number,
  m?: RenderingText,
  autoNewline?: boolean
): void {
  if (!m) {
    m = measureHorizontalText(context, r.width, text, baselineSkip, charSkip, autoNewline);
  }

  for (let [i, line] of m.horizontalLines.entries()) {
    if (method === "fill") {
      context.fillText(line.text, r.x, r.y + baselineSkip * i + baselineSkip * 0.8);
    } else if (method === "stroke") {
      context.strokeText(line.text, r.x, r.y + baselineSkip * i + baselineSkip * 0.8);
    }
  }
}

export function measureText(
  dir: Direction,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  baselineSkip: number,
  charSkip: number,
  autoNewline?: boolean
): RenderingText {
  const m = dir === 'v' ?
    measureVerticalText(ctx, h * 0.85, text, baselineSkip, charSkip, autoNewline) :
    measureHorizontalText(ctx, w * 0.85, text, baselineSkip, charSkip, autoNewline);
  return m;
}

export function measureHorizontalText(
  context: CanvasRenderingContext2D,
  maxWidth: number,
  text: string,
  baselineSkip: number,
  charSkip: number,
  autoNewline?: boolean
): RenderingText {
  if (!autoNewline) {
    maxWidth = Infinity;
  }

  const a = kinsoku(
    (s: string[]) => {
      const m = context.measureText(s.join(''));
      return { size: m.width, wrap: maxWidth < m.width };
    },
    maxWidth,
    text
  );

  return {
    width: a.reduce((max, item) => Math.max(max, item.size), 0),
    height: baselineSkip * a.length,
    horizontalLines: a,
  };
}