import { drawVerticalText, measureVerticalText } from "./verticalText.js";

export { drawVerticalText, measureVerticalText };

export function drawText(dir, ctx, method, r, text, baselineSkip, charSkip, m, autoNewline) {
  console.log("drawText", autoNewline);
  if (dir === 'v') {
    drawVerticalText(ctx, method, r, text, baselineSkip, charSkip, autoNewline);
  } else {
    drawHorizontalText(ctx, method, r, text, baselineSkip, m, autoNewline);
  }
}

export function drawHorizontalText(context, method, r, text, baselineSkip, m, autoNewline) {
  if (!m) {
    m = measureHorizontalText(context, r.width, text, baselineSkip, autoNewline);
  }

  let lineHead = 0;
  for (let i = 0; i < m.lines.length; i++) {
    const lineTail = m.lines[i];
    const line = text.substring(lineHead, lineTail);
    if (method === "fill") {
      context.fillText(line, r.x, r.y + baselineSkip * i + baselineSkip * 0.8 /* Ascentの雑な計算 */ );
    } else if (method === "stroke") {
      context.strokeText(line, r.x, r.y + baselineSkip * i + baselineSkip * 0.8 /* Ascentの雑な計算 */ );
    }
    lineHead = lineTail;
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

  let width = 0;
  let lines = [];
  let index = 0;
  while (index < text.length) {
    const lineHead = index;
    while (index < text.length) {
      if (text[index] === "\n") {
        index++;
        break;
      }

      const s = text.substring(lineHead, index + 1);
      const m = context.measureText(s);
      const cw = m.width;

      if (maxWidth < cw) {
        width = maxWidth;
        break;
      }
      width = Math.max(width, cw);
      index++;
    }
    if (index == lineHead) { break; }
    lines.push(index);
  }

  return {
    width: width,
    height: baselineSkip * lines.length,
    lines: lines,
  };
}
