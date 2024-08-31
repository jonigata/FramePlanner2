import { kinsokuGenerator, isEmojiAt, leaderChars, trailerChars } from "../kinsoku";
import { parseMarkdownToJson, richTextIterator, type RichFragment } from "./richText";
import type { Rectangle, RenderingText, DrawMethod } from "./typeSetting";

export function drawVerticalText(
  context: CanvasRenderingContext2D, 
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
  if (!m) {
    m = measureVerticalText(context, r.height, text, baselineSkip, charSkip, autoNewline);
  }

  let cursorX = r.x + r.width - baselineSkip * 0.5; // center of the text
  for (const line of m.verticalLines) {
    let lineH = 0;
    let prev = null;
    for (const frag of line) {
      let startH: number, endH: number;
      ({lineH, prev, startH, endH} = drawFragment(context, r, cursorX, lineH, charSkip, method, frag, 1, false, prev));
      if (frag.ruby) {
        /*
        context.strokeStyle = "red";
        context.beginPath();
        context.moveTo(cursorX - baselineSkip * 0.5, r.y + startH);
        context.lineTo(cursorX + baselineSkip * 0.5, r.y + startH);
        context.stroke();
        context.strokeStyle = "green";
        context.beginPath();
        context.moveTo(cursorX - baselineSkip * 0.5, r.y + endH);
        context.lineTo(cursorX + baselineSkip * 0.5, r.y + endH);
        context.stroke();
        */

        const region = endH - startH;
        const rubyCharSkip = region / frag.ruby.length;
        const rubyX = cursorX + baselineSkip * rubyDistance;
        const rubyFragment = {
          chars: frag.ruby,
          color: frag.color
        }
        drawFragment(context, r, rubyX, startH, rubyCharSkip, method, rubyFragment, rubySize, true, null);
      }
    }
    cursorX -= baselineSkip;
  }
}

function drawLine(context: CanvasRenderingContext2D, x: number, y: number, w: number, color: string): void {;
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x+w, y);
  context.stroke();
}

function drawFragment(
  context: CanvasRenderingContext2D, 
  r: Rectangle, 
  cursorX: number, 
  lineH: number, 
  charSkip: number, 
  method: DrawMethod,
  frag: RichFragment,
  charScale: number,
  justify: boolean,
  prev: string): { lineH: number, prev: string, startH: number, endH: number } {

  let startH = null;
  let endH = null;

  if (frag.romanHanging) {
    const s = frag.chars.join('');
    const tm: TextMetrics = context.measureText(s);
    const cw = tm.width;
    const ch = tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent;
    const adjustDown = charSkip * 0.15;// 日本語文字の平均的なdescent分のヒューリスティック;

    if (startH === null) { startH = lineH; }
    endH = lineH + cw;

    context.save();
    context.translate(cursorX - ch * 0.5, r.y + lineH + adjustDown); 
    context.rotate(90 * Math.PI / 180);
    context.scale(charScale, charScale);
    if (method === "fill") {
      if (frag.color) { context.fillStyle = frag.color; }
      context.fillText(s, 0, 0);
    } else if (method === "stroke") {
      if (frag.color) { context.strokeStyle = frag.color; }
      context.strokeText(s, 0, 0);
    }
    context.restore();
    return {lineH: lineH + cw, prev, startH, endH};
  }

  function drawRotatedChar(angle: number, ax: number, ay: number, xscale: number, yscale: number, s: string): void {
    const tm: TextMetrics = context.measureText(s);
    const cw = tm.width;
    const ch = tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent;

    if (startH === null) {
      startH = lineH + charSkip - tm.actualBoundingBoxAscent; 
    }
    endH = lineH + charSkip + tm.actualBoundingBoxDescent;

    const pivotX = cursorX;
    const pivotY = r.y + lineH + charSkip * 0.5; // 空間の中央

    context.save();
    context.translate(pivotX, pivotY);
    /*
    drawLine(context, -charSkip * 0.5, 0, charSkip, "blue"); // 空間の中心
    drawLine(context, -charSkip * 0.5, charSkip * 0.5, charSkip, "green");
    */
    context.scale(charScale, charScale);
    context.translate(ax * charSkip, ay * charSkip); // オフセット
    context.rotate(angle * Math.PI / 180);
    context.scale(xscale, yscale);

    // フォントAPIは左下から始まるので、文字の中心に合わせるために調整
    context.translate(- cw * 0.5, charSkip * 0.5);
    if (method === "fill") {
      if (frag.color) { context.fillStyle = frag.color; }
      context.fillText(s,0,0);
    } else if (method === "stroke") {
      if (frag.color) { context.strokeStyle = frag.color; }
      context.strokeText(s,0,0);
    }
    context.restore();
  }

  function drawChar(ax: number, ay: number, s: string) {
    drawRotatedChar(0, ax, ay, 1, 1, s);
  }

  for (const c of frag.chars) {
    // ヒューリスティック、源暎アンチックを基準にしているが、
    // 源暎エムゴなどでは合わないこともあるので若干緩和している
    lineH += limitedKerning(prev, c) * charSkip;
    switch (true) {
      case /[、。]/.test(c):
        drawChar(0.6, -0.6, c);
        break;
      case /[“]/.test(c):
        drawRotatedChar(0, 0.5, 0.5, -1, 1, "〝");
        break;
      case /[”]/.test(c):
        drawRotatedChar(0, -0.4, -0.4, -1, 1, "〟");
        break;
      case /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヵヶ]/.test(c):
        drawChar(0.1, -0.1, c);
        break;
      case /[「『：；]/.test(c):
        drawRotatedChar(90, 0.2, 0.1, 1, 1, c);
        break;
      case /[」』]/.test(c):
        drawRotatedChar(90, 0.1, 0.3, 1, 1, c);
        break;
      case /[＜（【〔≪｛]/.test(c):
        drawRotatedChar(90, 0.15, 0.15, 1, 1, c);
        break;
      case /[＞）】〕≫｝]/.test(c):
        drawRotatedChar(90, 0.15, 0.15, 1, 1, c);
        break;
      case /[ー…―〰]/.test(c):
        drawRotatedChar(90, -0.1, 0.1, 1, -1, c);
        break;
      case /[～]/.test(c):
        drawRotatedChar(90, 0.1, 0.1, 1, 1, c);
        break;
      case isEmojiAt(c, 0):
        drawChar(0, 0, c);
        break;
      default:
        drawChar(0, 0, c);
        break;
    }
    lineH += charSkip;
    prev = c;
  }

  return {lineH, prev, startH, endH};
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

  function calcHeight(ca: RichFragment[]): number {
    let h = 0;
    let prev = null;
    for (const frag of ca) {
      if (frag.romanHanging) {
        const m = context.measureText(frag.chars.join(''));
        h += m.width;
      } else {
        for (const c of frag.chars) {
          h += limitedKerning(prev, c);
          h += charSkip;
          prev = c;
        }
      }
    }
    return h;
  }

  const textLines = text.split('\n');
  const a: { size: number; text: RichFragment[]; }[] = [];

  for (const line of textLines) {
    const segments = parseMarkdownToJson(line);
    
    const richIterator = richTextIterator(segments);
    
    const iterator = kinsokuGenerator(
      (s: RichFragment[]) => {
        const h = calcHeight(s);
        return { size: h, wrap: maxHeight < h };
      }, 
      maxHeight,
      richIterator,
      0,
      (c: RichFragment) => c.chars.length == 1 && leaderChars.has(c.chars[0]),
      (c: RichFragment) => c.chars.length == 1 && trailerChars.has(c.chars[0]));
    
    for (const result of iterator) {
      a.push({ size: result.size, text: result.buffer });
    }
  }
    
  return {
    height: a.reduce((max, item) => Math.max(max, item.size), 0),
    width: baselineSkip * a.length,
    verticalLines: a.map(item => item.text)
  };
}

function limitedKerning(c0: string, c1: string): number {
  if (!c0) { 
    if (/[「『（【〔“]/.test(c1)) { return -0.3; } 
    return 0;
  }
  if (/[、。」』）】〕”]/.test(c0)) {
    if (/[「『（【〔“]/.test(c1)) { return -0.5; } else if (/[、。]/.test(c1)) { return -0.5; }
    return -0.4;
  } else {
    if (/[「『（【〔“]/.test(c1)) { return -0.4; }
  }
  return 0;
}

