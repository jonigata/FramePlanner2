import { kinsokuGenerator, isEmojiAt, leaderChars, trailerChars } from "../kinsoku";
import { parseMarkdownToJson, richTextIterator, type RichChar } from "./richText";

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderingText {
  height: number;
  width: number;
  lines: RichChar[][];
}

type DrawMethod = "fill" | "stroke";

export function drawVerticalText(
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
    m = measureVerticalText(context, r.height, text, baselineSkip, charSkip, autoNewline);
  }
  let cursorX = r.x + r.width - baselineSkip * 0.5; // center of the text
  for (let [i, line] of m.lines.entries()) {
    console.log(line);
    let lineH = 0;
    for (let j = 0; j < line.length; j++) {
      let c0 = line[j].char;
      let c1 = line[j+1]?.char;
      let color0 = line[j].color;
      const m = context.measureText(c0);
      const cw = m.width;
      
      function drawChar(ax: number, ay: number): void {
        context.save();
        if (method === "fill") {
          if (color0) { context.fillStyle = color0; }
          context.fillText(
            c0, 
            cursorX - cw * 0.5 + cw * ax, 
            r.y + charSkip + lineH + charSkip * ay
          );
        } else if (method === "stroke") {
          if (color0) { context.strokeStyle = color0; }
          context.strokeText(
            c0,
            cursorX - cw * 0.5 + cw * ax,
            r.y + charSkip + lineH + charSkip * ay
          );
        }
        context.restore();
      }
      
      function drawRotatedChar(angle: number, ax: number, ay: number, xscale: number): void {
        const pivotX = cursorX + cw * ax;
        const pivotY = r.y + charSkip + lineH + charSkip * ay;
        context.save();
        context.translate(pivotX, pivotY);
        context.rotate(angle * Math.PI / 180);
        context.scale(1, xscale);
        if (method === "fill") {
          context.fillText(c0, -cw * 0.5, charSkip * 0.5);
        } else if (method === "stroke") {
          context.strokeText(c0, -cw * 0.5, charSkip * 0.5);
        }
        context.restore();
      }
      
      switch (true) {
        case /[、。]/.test(c0):
          drawChar(0.7, -0.6);
          break;
        case /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヵヶ]/.test(c0):
          drawChar(0.1, -0.1);
          break;
        case /[「」『』（）＜＞【】〔〕≪≫＜＞｛｝：；〝〟]/.test(c0):
          drawRotatedChar(90, 0.2, -0.4, 1);
          break;
        case /[ー…～―]/.test(c0):
          drawRotatedChar(90, -0.1, -0.4, -1);
          break;
        case /[0-9!?]{2}/.test(c0):
          if (c0 == '!?') { drawChar(0, 0); } else { drawChar(0, 0); }
          break;
        case isEmojiAt(c0, 0):
          console.log("Emoji:", c0, c0.length, cw);
          drawChar(0, 0); 
          break;
        default:
          drawChar(0, 0);
          break;
      }
      lineH += charSkip;
      lineH += limitedKerning(c0, c1) * charSkip;
    }
    cursorX -= baselineSkip;
  }
}

export function measureVerticalText(
  context: CanvasRenderingContext2D, 
  maxHeight: number, 
  text: string, 
  baselineSkip: number, 
  charSkip: number, 
  autoNewline?: boolean
): RenderingText {
  if (!autoNewline) { maxHeight = Infinity; }

  function calcHeight(ca: RichChar[]): number {
    let h = 0;
    for (let i = 0 ; i < ca.length ; i++) {
      h += charSkip;
      if (i < ca.length - 1) {
        h += limitedKerning(ca[i].char, ca[i+1].char) * charSkip;
      }
    }
    return h;
  }

  const textLines = text.split('\n');
  const a: { size: number; text: RichChar[]; }[] = [];

  for (const line of textLines) {
    const segments = parseMarkdownToJson(line);
    console.log(segments);
    
    const richIterator = createMergedIterator(richTextIterator(segments));
    
    const iterator = kinsokuGenerator(
      (s: RichChar[]) => {
        const h = calcHeight(s);
        return { size: h, wrap: maxHeight < h };
      }, 
      maxHeight,
      richIterator,
      0,
      (c: RichChar) => leaderChars.has(c.char),
      (c: RichChar) => trailerChars.has(c.char));
    
    for (const result of iterator) {
      console.log(result);
      a.push({ size: result.size, text: result.buffer });
    }
  }
  console.log(a);
    
  return {
    height: a.reduce((max, item) => Math.max(max, item.size), 0),
    width: baselineSkip * a.length,
    lines: a.map(item => item.text)
  };
}

function limitedKerning(c0: string, c1: string): number {
  if (/[、。」』）】〕〟]/.test(c0)) {
    if (/[「『（【〔〝]/.test(c1)) { return -1; } else if (/[、。]/.test(c1)) { return -0.5; }
  }
  return 0;
}

function* createMergedIterator(baseIterator: Generator<RichChar, void, unknown>): Generator<RichChar, void, unknown> {
  // [0-9!?]をまとめる

  let stock: RichChar | null = null;

  function getNext() {
    if (stock == null) {
      const result = baseIterator.next();
      if (result.done) return;
      return result.value as RichChar;
    }
    const nc = stock;
    stock = null;
    return nc;
  }

  while (true) {
    const currChar = getNext();
    if (currChar == null) {
      return;
    }

    if (/^[0-9!?]$/.test(currChar.char)) {
      const nextChar = getNext();
      if (nextChar == null) {
        yield currChar;
        return;
      }
      if (/^[0-9!?]$/.test(nextChar.char)) {
        // TODO: colorとか見てない
        yield {
          char: currChar.char + nextChar.char
        };
      } else {
        yield currChar;
        stock = nextChar;
      }
    } else {
      yield currChar;
    }
  }
}

