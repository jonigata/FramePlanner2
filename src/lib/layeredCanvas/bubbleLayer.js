import { Layer, sequentializePointer } from "./layeredCanvas.js";
import { keyDownFlags } from "./keyCache.js";
import { drawVerticalText, measureVerticalText } from "./verticalText.js";
import { drawBubble } from "./bubbleGraphic";
import { ClickableIcon } from "./clickableIcon.js";

const minimumBubbleSize = 72;

export class BubbleLayer extends Layer {
    constructor(interactable, onShowInspector, onHideInspector, onSubmit, onGetDefaultText) {
        super();
        this.interactable = interactable;
        this.bubbles = [];
        this.onShowInspector = onShowInspector;
        this.onHideInspector = onHideInspector;
        this.onSubmit = onSubmit;
        this.onGetDefaultText = onGetDefaultText;
        this.defaultBubble = {
          p0: [0,0],
          p1: [128,128],
          text: "empty",
          shape: "square",
          fontStyle: "normal",
          fontWeight: "400",
          fontSize: 22,
          fontFamily: "Shippori Mincho",
        };

        this.createBubbleIcon = new ClickableIcon("bubble.png", [4, 4], [32, 32]);
        this.dragIcon = new ClickableIcon("drag.png", [0, 0], [32, 32]);

        this.zPlusIcon = new ClickableIcon("zplus.png", [0, 0], [32, 32]);
        this.zMinusIcon = new ClickableIcon("zminus.png", [0, 0], [32, 32]);
        this.removeIcon = new ClickableIcon("remove.png", [0, 0], [32, 32]);
    }

    render(ctx) {
        if (this.interactable) {
            this.createBubbleIcon.render(ctx);
        }

        for (let bubble of this.bubbles) {
            const [x,y] = bubble.p0;
            const [w,h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

            if (this.isBubbleEnoughSize(bubble)) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            } else {
                ctx.fillStyle = "rgba(255, 128, 0, 0.9)";
            }
            drawBubble(ctx, bubble.text, [x, y, w, h], bubble.shape);


            if (bubble.text) {
                const baselineSkip = bubble.fontSize * 1.5;
                const charSkip = bubble.fontSize;

                // draw text
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${bubble.fontSize}px '${bubble.fontFamily}'`;
                ctx.font = ss;
                const textMaxHeight = h * 0.85;
                const s = measureVerticalText(ctx, textMaxHeight, bubble.text, baselineSkip, charSkip);
                const tx = bubble.p0[0] + (w - s.width)/2;
                const ty = bubble.p0[1] + (h - s.height)/2;
                const tw = s.width;
                const th = s.height;
                drawVerticalText(ctx, { x:tx, y:ty, width:tw, height:th }, bubble.text, baselineSkip, charSkip);
            }

            if (!this.interactable) { continue; }
            
            if (bubble === this.selected) {
                ctx.save();
                ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
                ctx.strokeRect(x, y, w, h);

                this.dragIcon.render(ctx);
                this.zMinusIcon.render(ctx);
                this.zPlusIcon.render(ctx);
                this.removeIcon.render(ctx);
                ctx.restore();
            }

            // draw resize handle
            if (bubble === this.selected && this.handle) {
                const threshold = 5;
                ctx.save();
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
                ctx.restore();
            }
        }
    }

    accepts(point) {
        if (!this.interactable) { return null; }

        if (keyDownFlags["Space"]) {
            return null;
        }

        if (keyDownFlags["KeyF"]) {
            return { action: 'create' };
        }
        if (this.createBubbleIcon.contains(point)) {
            return { action: "create" };
        }
        if (this.selected) {
            const bubble = this.selected;

            const handle = this.getHandleOf(bubble, point);
            if (handle) {
              return { action: "resize", bubble: bubble, handle: handle };
            }
        }
        for (let bubble of this.bubbles) {
            if (point[0] >= bubble.p0[0] && point[0] <= bubble.p1[0] &&
                point[1] >= bubble.p0[1] && point[1] <= bubble.p1[1]) {
                if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
                    return { action: 'move', bubble: bubble };
                } else if (bubble === this.selected && this.dragIcon.contains(point)) {
                    return { action: "move", bubble: bubble };
                } else if (bubble === this.selected && this.zMinusIcon.contains(point)) {
                    return { action: "z-minus", bubble: bubble };
                } else if (bubble === this.selected && this.zPlusIcon.contains(point)) {
                    return { action: "z-plus", bubble: bubble };
                } else if (bubble === this.selected && this.removeIcon.contains(point)) {
                    return { action: "remove", bubble: bubble };
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
        this.onSubmit();
        this.onHideInspector();
        this.selected = null;
        this.redraw();
    }

    pointerHover(p) {
        if (keyDownFlags["Space"]) {
            return false;
        }

        if (this.createBubbleIcon.contains(p)) {
            this.hint(this.createBubbleIcon.hintPosition, "ドラッグでフキダシ作成");
            return true;
        }

        // edge selection, top/bottom/left/right
        if (this.selected) {
            this.handle = this.getHandleOf(this.selected, p);
            if (this.isBubbleContains(this.selected, p)) {
                if (this.dragIcon.contains(p)) {
                  this.hint(this.dragIcon.hintPosition, "ドラッグで移動");
                } else if (this.zMinusIcon.contains(p)) {
                  this.hint(this.zMinusIcon.hintPosition, "手前に");
                } else if (this.zPlusIcon.contains(p)) {
                  this.hint(this.zPlusIcon.hintPosition, "奥に");
                } else if (this.removeIcon.contains(p)) {
                  this.hint(this.removeIcon.hintPosition, "削除");
                } else {
                  this.hint(p, null);
                }
                return true;
            }
        }

        for (let bubble of this.bubbles) {
            if (this.isBubbleContains(bubble, p)) {
                const [x0, y0] = bubble.p0;
                const [x1, y1] = bubble.p1;
                this.hint(
                    [(x0 + x1) / 2, y0 - 20],
                    "Alt+ドラッグで移動、クリックで選択"
                    );
                return true;
            }
        }
        return false;
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

    async *pointer(dragStart, payload) {
        console.log(payload);
        this.hint(dragStart, null);

        if (payload.action === 'create') {
            this.unfocus();
            const bubble = { 
                ...this.defaultBubble ,
                p0: dragStart, 
                p1: dragStart, 
                text: await this.onGetDefaultText(), 
            };
            this.bubbles.push(bubble);

            let p;
            while (p = yield) {
                bubble.p1 = p;
                this.redraw();
            }

            if (!this.isBubbleEnoughSize(bubble)) {
                this.bubbles.pop();
            }
        } else if (payload.action === 'move') {
            const bubble = payload.bubble;
            const [dx, dy] = [dragStart[0] - bubble.p0[0], dragStart[1] - bubble.p0[1]];
            const [w,h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

            let p;
            while (p = yield) {
                bubble.p0 = [p[0] - dx, p[1] - dy];
                bubble.p1 = [bubble.p0[0] + w, bubble.p0[1] + h];
                if (bubble === this.selected) {
                    this.setIconPositions();
                }
                this.redraw();
            }
        } else if (payload.action === 'select') {
            console.log('select');
            this.unfocus();
            this.selected = payload.bubble;
            const [x0, y0] = this.selected.p0;
            const [x1, y1] = this.selected.p1;
            this.setIconPositions();
            this.onShowInspector(this.selected, [(x0 + x1) / 2, y1]);

            this.redraw();
        } else if (payload.action === 'resize') {
            const bubble = payload.bubble;
            const handle = payload.handle;

            const oldRect = [bubble.p0, bubble.p1];
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
                this.setIconPositions();
                this.redraw();
            }
            if (!this.isBubbleEnoughSize(bubble)) {
                bubble.p0 = oldRect[0];
                bubble.p1 = oldRect[1];
                this.setIconPositions();
                this.redraw();
            }
        } else if (payload.action === 'z-plus') {
            const bubble = payload.bubble;
            const index = this.bubbles.indexOf(bubble);
            if (index < this.bubbles.length - 1) {
                this.bubbles.splice(index, 1);
                this.bubbles.push(bubble);
                this.redraw();
            }
        } else if (payload.action === 'z-minus') {
            const bubble = payload.bubble;
            const index = this.bubbles.indexOf(bubble);
            if (0 < index) {
                this.bubbles.splice(index, 1);
                this.bubbles.unshift(bubble);
                this.redraw();
            }
        } else if (payload.action === 'remove') {
            const bubble = payload.bubble;
            const index = this.bubbles.indexOf(bubble);
            this.bubbles.splice(index, 1);
            this.unfocus();
            this.redraw();
        }

    }

    setIconPositions() {
        const [x0, y0] = this.selected.p0;
        const [x1, y1] = this.selected.p1;

        this.dragIcon.position = [(x0 + x1) / 2 - 16, y0 + 4];
        this.zPlusIcon.position = [x0 + 4, y0 + 4];
        this.zMinusIcon.position = [x0 + 4, y0 + 36];
        this.removeIcon.position = [x1 - 36, y0 + 4];
    }

    isBubbleContains(bubble, p) {
        const [px, py] = p;
        const [rx0, ry0] = bubble.p0;
        const [rx1, ry1] = bubble.p1;

        if (rx0 <= px && px <= rx1 && ry0 <= py && py <= ry1) {
            return true;
        }
        return false;
    }

    isBubbleEnoughSize(bubble) {
        const [rx0, ry0] = bubble.p0;
        const [rx1, ry1] = bubble.p1;

        if (rx1 - rx0 < minimumBubbleSize || ry1 - ry0 < minimumBubbleSize) {
            return false;
        }
        return true;
    }
}

