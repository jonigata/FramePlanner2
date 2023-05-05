export function drawVerticalText(context, method, r, text, baselineSkip, charSkip, autoNewline) {
    let rHeight = autoNewline ? r.height : Infinity;

    let cursorX = r.x + r.width - baselineSkip * 0.5; // center of the text
    let index = 0;
    while (index < text.length) {
        let lineH = 0;
        const lineHead = index;
        while (index < text.length) {
            let c = text.charAt(index);
            const m = context.measureText(c);
            const cw = m.width;

            if (c === "\n") {
                index++;
                break;
            }
            if (rHeight < lineH + charSkip) {
                break;
            }

            function drawChar(ax, ay, colored) {
                context.save();
                if (colored) { context.fillStyle = 'red'; }
                if (method === "fill") {
                    context.fillText(
                        c, 
                        cursorX - cw * c.length * 0.5 + cw * ax, 
                        r.y + charSkip + lineH + charSkip * ay);
                } else if (method === "stroke") {
                    context.strokeText(
                        c,
                        cursorX - cw * c.length * 0.5 + cw * ax,
                        r.y + charSkip + lineH + charSkip * ay);
                }
                context.restore();
            }

            function drawRotatedChar(angle, ax, ay, xscale, colored) {
                // draw 90 degree rotated text
                const pivotX = cursorX + cw * ax;
                const pivotY = r.y + charSkip + lineH + charSkip * ay;
                context.save();
                if (colored) { context.fillStyle = "red"; }
                context.translate(pivotX, pivotY);
                context.rotate(angle * Math.PI / 180);
                context.scale(1, xscale);
                if (method === "fill") {
                    context.fillText(c, -cw * 0.5, charSkip * 0.5);
                } else if (method === "stroke") {
                    context.strokeText(c, -cw * 0.5, charSkip * 0.5);
                }
                context.restore();
            }

            switch (true) {
                case /[、。]/.test(c):
                    drawChar(0.7, -0.7)
                    break;
                case /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヵヶ]/.test(c):
                    drawChar(0.1, -0.1);
                    break;
                case /[「」『』（）＜＞【】〔〕≪≫＜＞～―…：；〝〟]/.test(c):
                    drawRotatedChar(90, 0.2, -0.4, 1);
                    break;
                case /[ー]/.test(c):
                    drawRotatedChar(87, -0.2, -0.35, -1);
                    break;
                case /[0-9!?]/.test(c):
                    if (index + 1 < text.length && /[0-9!?]/.test(text.charAt(index + 1))) {
                        c += text.charAt(index + 1);
                    }
                    if (c == '!?') {
                        drawChar(-0.2, 0);
                    } else {
                        drawChar(0, 0);
                    }
                    break;
                case isEmojiAt(text, index):
                    c = getEmojiAt(text, index);
                    drawChar((c.length-1)*0.3, 0);
                    break;
                default:
                    drawChar(0, 0);
                    break;
            }

            lineH += charSkip;
            lineH += limitedKerning(text, index) * charSkip;

            index += c.length;
        }
        if (index == lineHead) { break; }
        cursorX -= baselineSkip;
    }
}

export function measureVerticalText(context, maxHeight, text, baselineSkip, charSkip, autoNewline) {
    if (!autoNewline) { maxHeight = Infinity; }

    let height = 0;
    let lines = 0;
    let index = 0;
    while (index < text.length) {
        let lineH = 0;
        const lineHead = index;
        while (index < text.length) {
            let c = text.charAt(index);

            if (c === "\n") {
                index++;
                break;
            }

            if (/[0-9!?]/.test(c) && index + 1 < text.length && /[0-9!?]/.test(text.charAt(index + 1))) {
                c += text.charAt(index + 1);
            }            
            if (isEmojiAt(text, index)) {
                c = getEmojiAt(text, index);
            }

            lineH += charSkip;
            lineH += limitedKerning(text, index) * charSkip;
            if (maxHeight < lineH) {
                lineH = maxHeight;
                break;
            }

            index += c.length;
        }

        if (index == lineHead) { break; }
        height = Math.max(height, lineH);
        lines++;
    }

    return {
        width: lines * baselineSkip,
        height
    };
}

function limitedKerning(s, index) {
    if (index < s.length - 1) {
        const c = s.charAt(index);
        const nextC = s.charAt(index + 1);
        if (/[、。」』）】〕〟]/.test(c)) {
            if (/[「『（【〔〝]/.test(nextC)) {
                return -1;
            } else if (/[、。]/.test(nextC)) {
                return -0.5;
            }
        }
    }
    return 0;
}

function isEmojiAt(str, index) {
    const codePoint = String.fromCodePoint(str.codePointAt(index));
    const regex = /\p{Emoji}/u;

    return regex.test(codePoint);
}

function getEmojiAt(str, index) {
    let endIndex = index + 1;
    if (str.codePointAt(index) > 0xFFFF) {
        // This is a surrogate pair, so the emoji is 2 characters long
        endIndex++;
    }
    return str.slice(index, endIndex);
}