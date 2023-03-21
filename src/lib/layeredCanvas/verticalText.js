export function drawVerticalText(context, r, text, baselineSkip, charSkip) {
    let cursorX = r.x + r.width - baselineSkip * 0.5; // center of the text
    let index = 0;
    while (index < text.length) {
        let lineH = 0;
        const lineHead = index;
        while (index < text.length) {
            const c = text.charAt(index);
            const m = context.measureText(c);
            const cw = m.width;

            if (c === "\n") {
                index++;
                break;
            }
            if (r.height < lineH + charSkip) {
                break;
            }

            function drawChar(ax, ay, colored) {
                context.save();
                context.fillStyle = colored ? 'red' : 'black';
                context.fillText(
                    c, 
                    cursorX - cw * 0.5 + cw * ax, 
                    r.y + charSkip + lineH + charSkip * ay);
                context.restore();
            }

            function drawRotatedChar(angle, ax, ay, xscale, colored) {
                // draw 90 degree rotated text
                const pivotX = cursorX + cw * ax;
                const pivotY = r.y + charSkip + lineH + charSkip * ay;
                context.save();
                context.fillStyle = colored ? 'red' : 'black';
                context.translate(pivotX, pivotY);
                context.rotate(angle * Math.PI / 180);
                context.scale(1, xscale);
                context.fillText(c, -cw * 0.5, charSkip * 0.5);
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
                default:
                    drawChar(0, 0);
                    break;
            }

            lineH += charSkip;
            lineH += limitedKerning(text, index) * charSkip;

            index++;
        }
        if (index == lineHead) { break; }
        cursorX -= baselineSkip;
    }
}

export function measureVerticalText(context, maxHeight, text, baselineSkip, charSkip) {
    let height = 0;
    let lines = 0;
    let index = 0;
    while (index < text.length) {
        let lineH = 0;
        const lineHead = index;
        while (index < text.length) {
            const c = text.charAt(index);

            if (c === "\n") {
                index++;
                break;
            }

            lineH += charSkip;
            lineH += limitedKerning(text, index) * charSkip;
            if (maxHeight < lineH) {
                lineH = maxHeight;
                break;
            }

            index++;
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
