import { kinsoku, isEmojiAt, getEmojiAt } from "../kinsoku";

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MeasuredText {
  height: number;
  width: number;
  lines: Array<{
    text: string;
    size: number;
  }>;
}

type DrawMethod = "fill" | "stroke";

export function drawVerticalText(
  context: CanvasRenderingContext2D, 
  method: DrawMethod, 
  r: Rectangle, 
  text: string, 
  baselineSkip: number, 
  charSkip: number, 
  m?: MeasuredText, 
  autoNewline?: boolean
): void {
  if (!m) {
    m = measureVerticalText(context, r.height, text, baselineSkip, charSkip, autoNewline);
  }
  let cursorX = r.x + r.width - baselineSkip * 0.5; // center of the text
  for (let [i, line] of m.lines.entries()) {
    let lineH = 0;
    for (let j = 0; j < line.text.length; j++) {
      let c0 = line.text.charAt(j);
      let c1 = line.text.charAt(j + 1);
      const m = context.measureText(c0);
      const cw = m.width;
      
      function drawChar(ax: number, ay: number): void {
        context.save();
        if (method === "fill") {
          context.fillText(
            c0, 
            cursorX - cw * c0.length * 0.5 + cw * ax, 
            r.y + charSkip + lineH + charSkip * ay
          );
        } else if (method === "stroke") {
          context.strokeText(
            c0,
            cursorX - cw * c0.length * 0.5 + cw * ax,
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
        case /[0-9!?][0-9!?]/.test(c0+c1):
          c0 += c1; j++;
          if (c0 == '!?') { drawChar(-0.2, 0); } else { drawChar(0, 0); }
          break;
        case isEmojiAt(line.text, j):
          c0 = getEmojiAt(line.text, j);
          drawChar((c0.length-1)*0.3, 0); 
          j+=c0.length-1;
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
): MeasuredText {
  if (!autoNewline) { maxHeight = Infinity; }
  
  function calcHeight(ca: string[]): number {
    let h = 0;
    for (let i = 0 ; i < ca.length ; i++) {
      let c0 = ca[i];
      let c1 = ca[i + 1];
      if (/[0-9!?][0-9!?]/.test(c0+c1)) {
        i++;
      }
      h += charSkip;
      if (i < ca.length - 1) {
        h += limitedKerning(ca[i], ca[i+1]) * charSkip;
      }
    }
    return h;
  }
  
  const a = kinsoku(
    (s: string[]) => {
      const h = calcHeight(s);
      return { size: h, wrap: maxHeight < h };
    }, 
    maxHeight, 
    text
  );
    
  return {
    height: a.reduce((max, item) => Math.max(max, item.size), 0),
    width: baselineSkip * a.length,
    lines: a,
  };
}

function limitedKerning(c0: string, c1: string): number {
  if (/[、。」』）】〕〟]/.test(c0)) {
    if (/[「『（【〔〝]/.test(c1)) { return -1; } else if (/[、。]/.test(c1)) { return -0.5; }
  }
  return 0;
}
