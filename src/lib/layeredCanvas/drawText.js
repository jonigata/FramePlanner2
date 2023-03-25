import { drawVerticalText, measureVerticalText } from "./verticalText.js";

export { drawVerticalText, measureVerticalText };

export function drawHorizontalText(context, r, text, baselineSkip, m) {
  if (!m) {
    m = measureHorizontalText(context, r.width, text, baselineSkip);
  }

  let lineHead = 0;
  for (let i = 0; i < m.lines.length; i++) {
    const lineTail = m.lines[i];
    const line = text.substring(lineHead, lineTail);
    context.fillText(line, r.x, r.y + baselineSkip * (i + 1));
    lineHead = lineTail;
  }
}

export function measureHorizontalText(
  context,
  maxWidth,
  text,
  baselineSkip) {

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
  }
}
