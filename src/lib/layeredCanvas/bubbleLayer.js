import { Layer, sequentializePointer } from "./layeredCanvas.js";
import { keyDownFlags } from "./keyCache.js";
import { drawVerticalText, measureVerticalText } from "./verticalText.js";
import { drawBubble } from "./bubbleGraphic";

export class BubbleLayer extends Layer {
    constructor() {
        super();
        this.bubbles = [];

        // load write.png
        this.writeImage = new Image();
        this.writeImage.src = "write.png";
    }

    render(ctx) {
        for (let bubble of this.bubbles) {
            const [x,y] = bubble.p0;
            const [w,h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

            // draw ellipse, fill with white and 70% opacity and stroke with black
/*
            ctx.save();
            ctx.beginPath();
            ctx.translate(x, y);
            ctx.scale(w/2, h/2);
            ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);
            ctx.restore();
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fill();
            ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
            ctx.stroke();
            ctx.closePath();
*/
            drawBubble(ctx, bubble.text, [x, y, w, h], 'strokes');


            if (bubble.text) {
                const baselineSkip = 32;
                const charSkip = 22;

                // draw text
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                ctx.font = "20px 'Noto Serif JP', serif";
                const textMaxHeight = h * 0.85;
                const s = measureVerticalText(ctx, textMaxHeight, bubble.text, baselineSkip, charSkip);
                const tx = bubble.p0[0] + (w - s.width)/2;
                const ty = bubble.p0[1] + (h - s.height)/2;
                const tw = s.width;
                const th = s.height;
                drawVerticalText(ctx, { x:tx, y:ty, width:tw, height:th }, bubble.text, baselineSkip, charSkip);

                // draw rect
                // ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
                // ctx.strokeRect(tx, ty, tw, th);
            }

            if (bubble === this.selected) {
                ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
                ctx.strokeRect(x, y, w, h);

                // draw write icon on center
                ctx.drawImage(this.writeImage, x + w/2 - 32, y + h/2 - 32);
            }

            // draw resize handle
            if (bubble === this.selected && this.handle) {
                const threshold = 5;
                ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
                switch (this.handle) {
                    case 'top-left':
                        ctx.fillRect(x - threshold, y - threshold, threshold*2, threshold*2);
                        break;
                    case 'top-right':
                        ctx.fillRect(x + w - threshold, y - threshold, threshold*2, threshold*2);
                        break;
                    case 'bottom-left':
                        ctx.fillRect(x - threshold, y + h - threshold, threshold*2, threshold*2);
                        break;
                    case 'bottom-right':
                        ctx.fillRect(x + w - threshold, y + h - threshold, threshold*2, threshold*2);
                        break;
                    case 'top':
                        ctx.fillRect(x - threshold, y - threshold, w + threshold*2, threshold*2);
                        break;
                    case 'bottom':
                        ctx.fillRect(x - threshold, y + h - threshold, w + threshold*2, threshold*2);
                        break;
                    case 'left':
                        ctx.fillRect(x - threshold, y - threshold, threshold*2, h + threshold*2);
                        break;
                    case 'right':
                        ctx.fillRect(x + w - threshold, y - threshold, threshold*2, h + threshold*2);
                        break;
                }
            }
        }
    }

    accepts(point) {
        if (keyDownFlags["KeyF"]) {
            return { action: 'create' };
        }
        if (this.selected) {
            // check write icon
            const bubble = this.selected;
            const [x,y] = bubble.p0;
            const [w,h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];
            if (point[0] >= x + w/2 - 32 && point[0] <= x + w/2 + 32 &&
                point[1] >= y + h/2 - 32 && point[1] <= y + h/2 + 32) {
                this.createSpeechEditor(bubble);
                return true;
            }
        }
        for (let bubble of this.bubbles) {
            if (point[0] >= bubble.p0[0] && point[0] <= bubble.p1[0] &&
                point[1] >= bubble.p0[1] && point[1] <= bubble.p1[1]) {
                if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
                    return { action: 'move', bubble: bubble };
                } else {
                    return { action: 'select', bubble: bubble };
                }
            }
            const handle = this.getHandleOf(bubble, point);
            if (handle) {
                return { action: 'resize', bubble: bubble, handle: handle };
            }
        }

        return null;
    }

    unfocus() {
        this.commitSpeech();
        this.selected = null;
        this.redraw();
    }

    pointerHover(p) {
        // edge selection, top/bottom/left/right
        if (this.selected) {
            this.handle = this.getHandleOf(this.selected, p);
        }
    }

    getHandleOf(bubble, p) {
        const [px, py] = p;
        const [rx0, ry0] = bubble.p0;
        const [rx1, ry1] = bubble.p1;
        const threshold = 10;

        // return if the point is not in the rectangle plus threshold
        if (px < rx0 - threshold || px > rx1 + threshold || py < ry0 - threshold || py > ry1 + threshold) {
            return null;
        }

        // corner selection, top-left/top-right/bottom-left/bottom-right
        if (Math.abs(px - rx0) < threshold && Math.abs(py - ry0) < threshold) {
            return 'top-left';
        } else if (Math.abs(px - rx1) < threshold && Math.abs(py - ry0) < threshold) {
            return 'top-right';
        } else if (Math.abs(px - rx0) < threshold && Math.abs(py - ry1) < threshold) {
            return 'bottom-left';
        } else if (Math.abs(px - rx1) < threshold && Math.abs(py - ry1) < threshold) {
            return 'bottom-right';
        }

        // edge selection, top/bottom/left/right
        if (Math.abs(px - rx0) < threshold) {
            return 'left';
        } else if (Math.abs(px - rx1) < threshold) {
            return 'right';
        } else if (Math.abs(py - ry0) < threshold) {
            return 'top';
        } else if (Math.abs(py - ry1) < threshold) {
            return 'bottom';
        }

        return null;
    }

    *pointer(dragStart, payload) {

        if (payload.action === 'create') {
            const bubble = { p0: dragStart, p1: dragStart, text: "今回は……、\n「日常会話でしたーり」、\nプレゼントや【ジャジュジョ】" };
            this.bubbles.push(bubble);

            let p;
            while (p = yield) {
                bubble.p1 = p;
                this.redraw();
            }
        } else if (payload.action === 'move') {
            const bubble = payload.bubble;
            const [dx, dy] = [dragStart[0] - bubble.p0[0], dragStart[1] - bubble.p0[1]];
            const [w,h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

            let p;
            while (p = yield) {
                bubble.p0 = [p[0] - dx, p[1] - dy];
                bubble.p1 = [bubble.p0[0] + w, bubble.p0[1] + h];
                this.redraw();
            }
        } else if (payload.action === 'select') {
            this.unfocus();
            this.selected = payload.bubble;
            this.redraw();
        } else if (payload.action === 'resize') {
            const bubble = payload.bubble;
            const handle = payload.handle;
            const [dx, dy] = [dragStart[0] - bubble.p0[0], dragStart[1] - bubble.p0[1]];
            const [w,h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

            let p;
            while (p = yield) {
                switch (handle) {
                    case 'top-left':
                        bubble.p0 = [p[0], p[1]];
                        break;
                    case 'top-right':
                        bubble.p0 = [bubble.p0[0], p[1]];
                        bubble.p1 = [p[0], bubble.p1[1]];
                        break;
                    case 'bottom-left':
                        bubble.p0 = [p[0], bubble.p0[1]];
                        bubble.p1 = [bubble.p1[0], p[1]];
                        break;
                    case 'bottom-right':
                        bubble.p1 = [p[0], p[1]];
                        break;
                    case 'top':
                        bubble.p0 = [bubble.p0[0], p[1]];
                        break;
                    case 'bottom':
                        bubble.p1 = [bubble.p1[0], p[1]];
                        break;
                    case 'left':
                        bubble.p0 = [p[0], bubble.p0[1]];
                        break;
                    case 'right':
                        bubble.p1 = [p[0], bubble.p1[1]];
                        break;
                }
                this.redraw();
            }
        }
    }

    createSpeechEditor(bubble) {
        const rect = canvas.getBoundingClientRect();
        const x = (bubble.p0[0] + bubble.p1[0]) * 0.5 + rect.left;
        const y = bubble.p1[1] + rect.top;

        const textArea = document.createElement('textarea');
        textArea.style.position = 'absolute';
        textArea.value = "hiho";
        document.body.appendChild(textArea);
        textArea.style.left = `${x - textArea.offsetWidth / 2}px`;
        textArea.style.top = `${y - textArea.offsetHeight / 2}px`;

        setTimeout(() => {
            textArea.focus();
        }, 0);

        textArea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault();
                this.commitSpeech();
            }
        });

        this.speechEditor = textArea;
        return textArea;
    }

    commitSpeech() {
        if (this.speechEditor) {
            this.selected.text = this.speechEditor.value;
            this.destroySpeechEditor();
            this.redraw();
        }
    }

    destroySpeechEditor() {
        if (this.speechEditor) { // editor is dom element
            this.speechEditor.remove();
            this.speechEditor = null;
        }
    }

}

