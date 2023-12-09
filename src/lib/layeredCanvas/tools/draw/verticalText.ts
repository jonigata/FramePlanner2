import { kinsoku, isEmojiAt, getEmojiAt } from "../kinsoku";

export function drawVerticalText(context, method, r, text, baselineSkip, m, charSkip, autoNewline) {
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

      function drawChar(ax, ay) {
        context.save();
        if (method === "fill") {
          context.fillText(
            c0, 
            cursorX - cw * c0.length * 0.5 + cw * ax, 
            r.y + charSkip + lineH + charSkip * ay);
        } else if (method === "stroke") {
          context.strokeText(
            c0,
            cursorX - cw * c0.length * 0.5 + cw * ax,
            r.y + charSkip + lineH + charSkip * ay);
        }
        context.restore();
      }

      function drawRotatedChar(angle, ax, ay, xscale) {
        // draw 90 degree rotated text
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
          drawChar(0.7, -0.6)
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

export function measureVerticalText(context, maxHeight, text, baselineSkip, charSkip, autoNewline) {
  if (!autoNewline) { maxHeight = Infinity; }

  function calcHeight(ca) {
    let h = 0;
    for (let i = 0 ; i < ca.length ; i++) {
      let c0 = ca[i];
      let c1 = ca[i + 1];

      switch (true) {
        case /[0-9!?][0-9!?]/.test(c0+c1):
          i++;
          break;
        case isEmojiAt(c0, 0):
          i+=c0.length-1;
          break;
        default:
          break;
      }

      h += charSkip;
      if (i < ca.length - 1) {
        h += limitedKerning(ca[i], ca[i+1]) * charSkip;
      }
    }
    return h;
  }

  const a = kinsoku(
    s => {
      const h = calcHeight(s);
      return { size: h, wrap: maxHeight < h };
    }, maxHeight, text);
    
  return {
    height: a.reduce((max, item) => Math.max(max, item.size), 0),
    width: baselineSkip * a.length,
    lines: a,
  };
}

function limitedKerning(c0, c1) {
  if (/[、。」』）】〕〟]/.test(c0)) {
    if (/[「『（【〔〝]/.test(c1)) { return -1; } else if (/[、。]/.test(c1)) { return -0.5; }
  }
  return 0;
}
