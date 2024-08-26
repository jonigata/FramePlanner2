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
    let indexJ = 0;
    let indexK = 0;
    let stock = null;
    function peekNext(): { char: string; color: string; } | null {
      if (stock) { return stock; }
      if (line.length <= indexJ) { return null; }
      const char = line[indexJ].chars[indexK];
      const color = line[indexJ].color;
      stock = { char, color }; // charといってもlatin1文字列や絵文字などが含まれる。richText.ts参照のこと
      return stock;
    }
    function getNext(): { char: string; color: string; } | null {
      const result = peekNext();
      stock = null;
      if (!result) { return null; }
      indexK++;
      if (line[indexJ].chars.length <= indexK) {
        indexJ++;
        indexK = 0;
      }
      return result;
    }
  
    let lineH = 0;
    while(true) {
      const c0 = getNext();
      console.log(c0);
      if (c0 == null) { break; }
      const m = context.measureText(c0.char);
      const cw = m.width;
      
      function drawChar(ax: number, ay: number): void {
        context.save();
        if (method === "fill") {
          if (c0.color) { context.fillStyle = c0.color; }
          context.fillText(
            c0.char, 
            cursorX - cw * 0.5 + cw * ax, 
            r.y + charSkip + lineH + charSkip * ay
          );
        } else if (method === "stroke") {
          if (c0.color) { context.strokeStyle = c0.color; }
          context.strokeText(
            c0.char,
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
          context.fillText(c0.char, -cw * 0.5, charSkip * 0.5);
        } else if (method === "stroke") {
          context.strokeText(c0.char, -cw * 0.5, charSkip * 0.5);
        }
        context.restore();
      }
      
      switch (true) {
        case /[、。]/.test(c0.char):
          drawChar(0.7, -0.6);
          break;
        case /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヵヶ]/.test(c0.char):
          drawChar(0.1, -0.1);
          break;
        case /[「」『』（）＜＞【】〔〕≪≫＜＞｛｝：；〝〟]/.test(c0.char):
          drawRotatedChar(90, 0.2, -0.4, 1);
          break;
        case /[ー…～―]/.test(c0.char):
          drawRotatedChar(90, -0.1, -0.4, -1);
          break;
        case /[0-9!?]{2}/.test(c0.char):
          drawChar(0, 0);
          break;
        case isEmojiAt(c0.char, 0):
          drawChar(0, 0); 
          break;
        default:
          drawChar(0, 0);
          break;
      }
      lineH += charSkip;
      lineH += limitedKerning(c0.char, peekNext()?.char) * charSkip;
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
        h += limitedKerningCharRichChar(ca[i], ca[i+1]) * charSkip;
      }
    }
    return h;
  }

  const textLines = text.split('\n');
  const a: { size: number; text: RichChar[]; }[] = [];

  for (const line of textLines) {
    const segments = parseMarkdownToJson(line);
    
    const richIterator = richTextIterator(segments);
    
    const iterator = kinsokuGenerator(
      (s: RichChar[]) => {
        const h = calcHeight(s);
        return { size: h, wrap: maxHeight < h };
      }, 
      maxHeight,
      richIterator,
      0,
      (c: RichChar) => c.chars.length == 1 && leaderChars.has(c.chars[0]),
      (c: RichChar) => c.chars.length == 1 && trailerChars.has(c.chars[0]));
    
    for (const result of iterator) {
      a.push({ size: result.size, text: result.buffer });
    }
  }
    
  return {
    height: a.reduce((max, item) => Math.max(max, item.size), 0),
    width: baselineSkip * a.length,
    lines: a.map(item => item.text)
  };
}

function limitedKerning(c0: string, c1: string): number {
  if (!c1) { return 0; }
  if (/[、。」』）】〕〟]/.test(c0)) {
    if (/[「『（【〔〝]/.test(c1)) { return -1; } else if (/[、。]/.test(c1)) { return -0.5; }
  }
  return 0;
}

function limitedKerningCharRichChar(c0: RichChar, c1: RichChar): number {
  if (c0.chars.length != 1 || c1.chars.length != 1) { return 0; }
  return limitedKerning(c0.chars[0], c1.chars[0]);
}

