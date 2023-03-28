import { Layer, sequentializePointer } from "./layeredCanvas.js";
import { keyDownFlags } from "./keyCache.js";
import { drawHorizontalText, measureHorizontalText, drawVerticalText, measureVerticalText } from "./drawText.js";
import { drawBubble } from "./bubbleGraphic";
import { ClickableIcon } from "./clickableIcon.js";
import { Bubble } from "./bubble.js";
import { translate, scale } from "./pictureControl.js";

const iconSize = 20;

export class BubbleLayer extends Layer {
  constructor(
    interactable,
    onShowInspector,
    onHideInspector,
    onCommit,
    onGetDefaultText
  ) {
    super();
    this.interactable = interactable;
    this.bubbles = [];
    this.onShowInspector = onShowInspector;
    this.onHideInspector = onHideInspector;
    this.onCommit = onCommit;
    this.onGetDefaultText = onGetDefaultText;
    this.defaultBubble = new Bubble();
    this.creatingBubble = null;

    this.createBubbleIcon = new ClickableIcon(
      "bubble.png",
      [4, 4],
      [iconSize, iconSize]
    );
    this.dragIcon = new ClickableIcon("drag.png", [0, 0], [iconSize, iconSize]);

    this.zPlusIcon = new ClickableIcon(
      "zplus.png",
      [0, 0],
      [iconSize, iconSize]
    );
    this.zMinusIcon = new ClickableIcon(
      "zminus.png",
      [0, 0],
      [iconSize, iconSize]
    );
    this.removeIcon = new ClickableIcon(
      "remove.png",
      [0, 0],
      [iconSize, iconSize]
    );
  }

  render(ctx) {
    if (this.interactable) {
      this.createBubbleIcon.render(ctx);
    }

    for (let bubble of this.bubbles) {
      this.renderBubble(ctx, bubble);
    }

    if (this.creatingBubble) {
      this.renderBubble(ctx, this.creatingBubble);
    }
  }

  renderBubble(ctx, bubble) {
    if (bubble.hasEnoughSize()) {
      ctx.fillStyle = bubble.fillColor;
    } else {
      ctx.fillStyle = "rgba(255, 128, 0, 0.9)";
    }
    if (0 < bubble.strokeWidth) {
        ctx.strokeStyle = bubble.strokeColor;
    } else {
        ctx.strokeStyle = "rgba(0, 0, 0, 0)";
    }
    ctx.lineWidth = bubble.strokeWidth;

    // create/resize終わるまでは入れ替わっている可能性がある
    const [p0, p1] = bubble.regularized();
    const [x, y] = p0;
    const [w, h] = [p1[0] - p0[0], p1[1] - p0[1]];
    ctx.bubbleDrawMethod = "fill";
    drawBubble(ctx, bubble.text, [x, y, w, h], bubble.shape);

    if (bubble.image) {
      ctx.save();
      ctx.bubbleDrawMethod = "clip";
      drawBubble(ctx, bubble.text, [x, y, w, h], bubble.shape);
      const img = bubble.image;
      let iw = img.image.width * img.scale[0];
      let ih = img.image.height * img.scale[1];
      let ix = x + w * 0.5 - iw * 0.5 + img.translation[0];
      let iy = y + h * 0.5 - ih * 0.5 + img.translation[1];
      ctx.drawImage(bubble.image.image, ix, iy, iw, ih);
      ctx.clipping = undefined;
      ctx.restore();
    }

    ctx.bubbleDrawMethod = "stroke";
    drawBubble(ctx, bubble.text, [x, y, w, h], bubble.shape);

    if (bubble.text) {
      const baselineSkip = bubble.fontSize * 1.5;
      const charSkip = bubble.fontSize;

      // draw text
      ctx.fillStyle = bubble.fontColor;
      const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${bubble.fontSize}px '${bubble.fontFamily}'`;
      ctx.font = ss;

      if (bubble.direction == 'v') {
        const textMaxHeight = h * 0.85;
        const m = measureVerticalText(
            ctx,
            textMaxHeight,
            bubble.text,
            baselineSkip,
            charSkip
        );
        const tw = m.width;
        const th = m.height;
        const tx = p0[0] + (w - tw) / 2;
        const ty = p0[1] + (h - th) / 2;
        drawVerticalText(
            ctx,
            { x: tx, y: ty, width: tw, height: th },
            bubble.text,
            baselineSkip,
            charSkip
        );
      } else {
        const textMaxWidth = w * 0.85;
        const m = measureHorizontalText(
          ctx,
          textMaxWidth,
          bubble.text,
          baselineSkip);
        const tw = m.width;
        const th = m.height;
        const tx = p0[0] + (w - tw) / 2;
        const ty = p0[1] + (h - th) / 2;
        // ctx.strokeRect(tx, ty, tw, th);
        drawHorizontalText(
          ctx,
          { x: tx, y: ty, width: tw, height: th },
          bubble.text,
          baselineSkip,
          m);
      }
    }

    if (!this.interactable) {
      return;
    }

    if (bubble !== this.selected) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
    ctx.strokeRect(x, y, w, h);

    this.dragIcon.render(ctx);
    this.zMinusIcon.render(ctx);
    this.zPlusIcon.render(ctx);
    this.removeIcon.render(ctx);
    ctx.restore();

    if (this.handle) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
      const handleRect = bubble.getHandleRect(this.handle);
      if (handleRect) {
        ctx.fillRect(...handleRect);
      }
      ctx.restore();
    }
  }

  accepts(point) {
    if (!this.interactable) {
      return null;
    }

    if (keyDownFlags["Space"]) {
      return null;
    }

    if (keyDownFlags["KeyF"]) {
      return { action: "create" };
    }
    if (this.createBubbleIcon.contains(point)) {
      return { action: "create" };
    }

    if (this.selected) {
      const bubble = this.selected;

      if (this.removeIcon.contains(point)) {
        return { action: "remove", bubble };
      } else if (this.dragIcon.contains(point)) {
        return { action: "move", bubble };
      } else if (this.zMinusIcon.contains(point)) {
        return { action: "z-minus", bubble };
      } else if (this.zPlusIcon.contains(point)) {
        return { action: "z-plus", bubble };
      }

      const handle = bubble.getHandleAt(point);
      if (handle) {
        return { action: "resize", bubble, handle };
      }

      if (bubble.image) {
        if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) {
          return { action: "image-scale", bubble };
        } else if (!keyDownFlags["AltLeft"] && !keyDownFlags["AltRight"]) {
          return { action: "image-move", bubble };
        }
      }
    }
    for (let bubble of this.bubbles) {
      if (bubble.contains(point)) {
        console.log("A");
        if (keyDownFlags["KeyQ"]) {
            console.log("B");
          return { action: "remove", bubble };
        } else if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
        console.log("C");
          return { action: "move", bubble };
        } else {
        console.log("D");
          return { action: "select", bubble };
        }
        console.log("E");
      }
      const handle = bubble.getHandleAt(point);
      if (handle) {
        return { action: "resize", bubble, handle };
      }
    }

    return null;
  }

  unfocus() {
    if (this.selected) {
        this.onCommit(this.bubbles);
        this.onHideInspector();
        this.selected = null;
        this.redraw();
    }
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
      this.handle = this.selected.getHandleAt(p);

      if (this.removeIcon.contains(p)) {
        this.handle = null;
        this.hint(this.removeIcon.hintPosition, "削除");
      } else if (this.dragIcon.contains(p)) {
        this.handle = null;
        this.hint(this.dragIcon.hintPosition, "ドラッグで移動");
      } else if (this.zMinusIcon.contains(p)) {
        this.handle = null;
        this.hint(this.zMinusIcon.hintPosition, "手前に");
      } else if (this.zPlusIcon.contains(p)) {
        this.handle = null;
        this.hint(this.zPlusIcon.hintPosition, "奥に");
      } else if (this.selected.contains(p)) {
        this.hint(p, null);
      }

      if (this.handle || this.selected.contains(p)) {
        this.redraw();
        return true;
      }
    }

    for (let bubble of this.bubbles) {
      if (bubble.contains(p)) {
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

  async *pointer(dragStart, payload) {
    console.log(payload);
    this.hint(dragStart, null);

    if (payload.action === "create") {
      this.unfocus();
      const bubble = this.defaultBubble.clone();
      bubble.p0 = dragStart;
      bubble.p1 = dragStart;
      bubble.text = await this.onGetDefaultText();
      this.creatingBubble = bubble;

      let p;
      while ((p = yield)) {
        bubble.p1 = p;
        this.redraw();
      }

      this.creatingBubble = null;
      bubble.regularize();
      if (bubble.hasEnoughSize()) {
        this.bubbles.push(bubble);
        this.onCommit(this.bubbles);
      }
    } else if (payload.action === "move") {
      const bubble = payload.bubble;
      const [dx, dy] = [dragStart[0] - bubble.p0[0], dragStart[1] - bubble.p0[1]];
      const [w, h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

      let p;
      while ((p = yield)) {
        bubble.p0 = [p[0] - dx, p[1] - dy];
        bubble.p1 = [bubble.p0[0] + w, bubble.p0[1] + h];
        if (bubble === this.selected) {
          this.setIconPositions();
        }
        this.redraw();
      }
      this.onCommit(this.bubbles);
    } else if (payload.action === "select") {
      console.log("select");
      this.unfocus();
      this.selected = payload.bubble;
      this.setIconPositions();
      this.onShowInspector(this.selected);

      this.redraw();
    } else if (payload.action === "resize") {
      const bubble = payload.bubble;
      const handle = payload.handle;

      const oldRect = [bubble.p0, bubble.p1];
      let p;
      while ((p = yield)) {
        switch (handle) {
          case "top-left":
            bubble.p0 = [p[0], p[1]];
            break;
          case "top-right":
            bubble.p0 = [bubble.p0[0], p[1]];
            bubble.p1 = [p[0], bubble.p1[1]];
            break;
          case "bottom-left":
            bubble.p0 = [p[0], bubble.p0[1]];
            bubble.p1 = [bubble.p1[0], p[1]];
            break;
          case "bottom-right":
            bubble.p1 = [p[0], p[1]];
            break;
          case "top":
            bubble.p0 = [bubble.p0[0], p[1]];
            break;
          case "bottom":
            bubble.p1 = [bubble.p1[0], p[1]];
            break;
          case "left":
            bubble.p0 = [p[0], bubble.p0[1]];
            break;
          case "right":
            bubble.p1 = [p[0], bubble.p1[1]];
            break;
        }

        this.setIconPositions();
        this.redraw();
      }
      bubble.regularize();
      if (!bubble.hasEnoughSize()) {
        bubble.p0 = oldRect[0];
        bubble.p1 = oldRect[1];
        this.setIconPositions();
        this.redraw();
      }
    } else if (payload.action === "z-plus") {
      const bubble = payload.bubble;
      const index = this.bubbles.indexOf(bubble);
      if (index < this.bubbles.length - 1) {
        this.bubbles.splice(index, 1);
        this.bubbles.push(bubble);
        this.redraw();
      }
    } else if (payload.action === "z-minus") {
      const bubble = payload.bubble;
      const index = this.bubbles.indexOf(bubble);
      if (0 < index) {
        this.bubbles.splice(index, 1);
        this.bubbles.unshift(bubble);
        this.redraw();
      }
    } else if (payload.action === "remove") {
      const bubble = payload.bubble;
      const index = this.bubbles.indexOf(bubble);
      this.bubbles.splice(index, 1);
      this.unfocus();
      this.redraw();
    } else if (payload.action === "image-move") {
      const bubble = payload.bubble;
      const origin = bubble.image.translation;

      yield* translate(dragStart, (q) => {
        bubble.image.translation = [origin[0] + q[0], origin[1] + q[1]];
        this.redraw();
      });
    } else if (payload.action === "image-scale") {
      const bubble = payload.bubble;
      const origin = bubble.image.scale[0];

      yield* scale(this.canvas, dragStart, (q) => {
        const s = Math.max(q[0], q[1]);
        bubble.image.scale = [origin * s, origin * s];
        this.redraw();
      });
    }
  }

  dropped(image, position) {
    for (let bubble of this.bubbles) {
      if (bubble.contains(position)) {
         bubble.image = { image, translation: [0,0], scale: [1,1] };
         this.redraw();
         return true;
      }
    }
    return false;
  }

  setIconPositions() {
    const [x0, y0] = this.selected.p0;
    const [x1, y1] = this.selected.p1;

    this.dragIcon.position = [(x0 + x1) / 2 - iconSize * 0.5, y0 + 4];
    this.zPlusIcon.position = [x0 + 4, y0 + 4];
    this.zMinusIcon.position = [x0 + 4, y0 + 4 + iconSize];
    this.removeIcon.position = [x1 - 4 - iconSize, y0 + 4];
  }

}

