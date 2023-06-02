import { drawVerticalText, measureVerticalText } from "./verticalText.js";
import { kinsoku } from "./kinsoku.js";

export { drawVerticalText, measureVerticalText };

export function drawText(dir, ctx, method, r, text, baselineSkip, charSkip, m, autoNewline) {
  if (dir === 'v') {
    drawVerticalText(ctx, method, r, text, baselineSkip, m, charSkip, autoNewline);
  } else {
    drawHorizontalText(ctx, method, r, text, baselineSkip, m, autoNewline);
  }
}

export function drawHorizontalText(context, method, r, text, baselineSkip, m, autoNewline) {
  if (!m) {
    m = measureHorizontalText(context, r.width, text, baselineSkip, autoNewline);
  }

  for (let [i, line] of m.lines.entries()) {
    if (method === "fill") {
      context.fillText(line.text, r.x, r.y + baselineSkip * i + baselineSkip * 0.8 /* Ascentの雑な計算 */ );
    } else if (method === "stroke") {
      context.strokeText(line.text, r.x, r.y + baselineSkip * i + baselineSkip * 0.8 /* Ascentの雑な計算 */ );
    }
  }
}

export function measureText(dir, ctx, w, h, text, baselineSkip, charSkip, autoNewline) {
  const m = dir === 'v' ?
    measureVerticalText(ctx, h * 0.85, text, baselineSkip, charSkip, autoNewline) :
    measureHorizontalText(ctx, w * 0.85, text, baselineSkip, autoNewline);
  return m;
}

export function measureHorizontalText(
  context,
  maxWidth,
  text,
  baselineSkip,
  autoNewline) {

  if (!autoNewline) {
    maxWidth = Infinity;
  }

  const a = kinsoku(
    s => {
      const m = context.measureText(s.join(''));
      return { size: m.width, wrap: maxWidth < m.width };
    }, maxWidth, text);

  return {
    width: a.reduce((max, item) => Math.max(max, item.size), 0),
    height: baselineSkip * a.length,
    lines: a,
  };
}
