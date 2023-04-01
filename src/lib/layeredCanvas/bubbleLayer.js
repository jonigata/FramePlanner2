import { Layer } from "./layeredCanvas.js";
import { keyDownFlags } from "./keyCache.js";
import { drawHorizontalText, measureHorizontalText, drawVerticalText, measureVerticalText } from "./drawText.js";
import { drawBubble, bubbleOptionSets, getPath, drawPath } from "./bubbleGraphic";
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
    this.optionEditActive = {}

    this.createBubbleIcon = new ClickableIcon("bubble.png",[4, 4],[iconSize, iconSize], "ドラッグで作成", () => this.interactable);
    this.dragIcon = new ClickableIcon("drag.png", [0, 0], [iconSize, iconSize], "ドラッグで移動", () => this.interactable && this.selected);

    this.zPlusIcon = new ClickableIcon("zplus.png",[0, 0],[iconSize, iconSize], "フキダシ順で手前", () => this.interactable && this.selected);
    this.zMinusIcon = new ClickableIcon("zminus.png",[0, 0],[iconSize, iconSize], "フキダシ順で奥", () => this.interactable && this.selected);
    this.removeIcon = new ClickableIcon("remove.png",[0, 0],[iconSize, iconSize], "削除", () => this.interactable && this.selected);

    this.optionIcons = {};
    this.optionIcons.tail = new ClickableIcon("tail.png",[0, 0],[iconSize, iconSize], "ドラッグでしっぽ", () => this.interactable && this.selected);
    this.optionIcons.unite = new ClickableIcon("unite.png",[0, 0],[iconSize, iconSize], "ドラッグでリンク", () => this.interactable && this.selected);
  }

  render(ctx) {
    // 描画
    this.renderBubbles(ctx);

    this.createBubbleIcon.render(ctx);
    this.dragIcon.render(ctx);

    this.zPlusIcon.render(ctx);
    this.zMinusIcon.render(ctx);
    this.removeIcon.render(ctx);

    if (this.interactable && this.selected) {
      this.drawSelectedUI(ctx, this.selected);
      this.drawOptionHandles(ctx, this.selected);
      this.drawOptionUI(ctx, this.selected);
    }
  }

  renderBubbles(ctx) {
    // 親子関係解決
    const bubbleDic = {};
    for (let bubble of this.bubbles) {
      bubble.unitedPath = null;
      bubble.children = [];
      bubbleDic[bubble.uuid] = bubble;
    }

    for (let bubble of this.bubbles) {
      if (bubble.parent) {
        bubbleDic[bubble.parent].children.push(bubble);
      }
    }

    // 結合
    for (let bubble of this.bubbles) {
      if (0 < bubble.children.length) {
        bubble.unitedPath = this.uniteBubble([bubble, ...bubble.children]);
      }
    }

    const bubbles = [...this.bubbles];
    if (this.creatingBubble) {
      bubbles.push(this.creatingBubble);
    }

    for (let bubble of bubbles) {
      if (!bubble) continue;
      this.renderBubbleBackground(ctx, bubble);
    }

    for (let bubble of bubbles) {
      if (!bubble) continue;
      this.renderBubbleForeground(ctx, bubble);
    }
  }

  renderBubbleBackground(ctx, bubble) {
    // fill/stroke設定
    ctx.fillStyle = bubble.hasEnoughSize() ? bubble.fillColor : "rgba(255, 128, 0, 0.9)";;
    ctx.strokeStyle = 0 < bubble.strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.strokeWidth;

    // shape背景描画
    this.drawBubble(ctx, 'fill', bubble);

    // 画像描画
    if (bubble.image && !bubble.parent) {
      ctx.save();
      this.drawBubble(ctx, 'clip', bubble);

      const [x, y, w, h] = bubble.regularizedPositionAndSize();
      const img = bubble.image;
      let iw = img.image.width * img.scale[0];
      let ih = img.image.height * img.scale[1];
      let ix = x + w * 0.5 - iw * 0.5 + img.translation[0];
      let iy = y + h * 0.5 - ih * 0.5 + img.translation[1];
      ctx.drawImage(bubble.image.image, ix, iy, iw, ih);
      ctx.restore();
    }
  }

  renderBubbleForeground(ctx, bubble) {
    // shape枠描画
    this.drawBubble(ctx, 'stroke', bubble);

    // テキスト描画
    if (bubble.text) {
      const baselineSkip = bubble.fontSize * 1.5;
      const charSkip = bubble.fontSize;

      // draw text
      ctx.fillStyle = bubble.fontColor;
      const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${bubble.fontSize}px '${bubble.fontFamily}'`;
      ctx.font = ss;

      const [cx, cy] = bubble.center;
      const [w, h] = bubble.size;
      if (bubble.direction == 'v') {
        const textMaxHeight = h * 0.85;
        const m = measureVerticalText(ctx,textMaxHeight,bubble.text,baselineSkip,charSkip);
        const tw = m.width;
        const th = m.height;
        const tx = cx - tw * 0.5;
        const ty = cy - th * 0.5;
        drawVerticalText(ctx,{ x: tx, y: ty, width: tw, height: th },bubble.text,baselineSkip,charSkip);
      } else {
        const textMaxWidth = w * 0.85;
        const m = measureHorizontalText(ctx,textMaxWidth,bubble.text,baselineSkip);
        const tw = m.width;
        const th = m.height;
        const tx = cx - tw * 0.5;
        const ty = cy - th * 0.5;
        // ctx.strokeRect(tx, ty, tw, th);
        drawHorizontalText(ctx,{ x: tx, y: ty, width: tw, height: th },bubble.text,baselineSkip,m);
      }
    }
  }

  drawBubble(ctx, method, bubble) {
    const [x, y, w, h] = bubble.regularizedPositionAndSize();

    ctx.bubbleDrawMethod = method; // 行儀が悪い
    if (bubble.unitedPath) {
      drawPath(ctx, bubble.unitedPath);
    } else if (!bubble.parent) {
      drawBubble(ctx, bubble.text, [x, y, w, h], bubble.shape, bubble.optionContext);
    }
  }

  drawSelectedUI(ctx, bubble) {
    const [x, y, w, h] = bubble.regularizedPositionAndSize();

    // ハンドル枠描画
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // 操作対象のハンドルを強調表示
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

  drawOptionHandles(ctx, bubble) {
    const optionSet = bubble.optionSet;
    const [cx,cy] = bubble.center;
    for (const option of Object.keys(optionSet)) {
      let icon;
      switch (option) {
        case "angleVector":
          icon = this.optionIcons[optionSet.angleVector.icon];
          icon.position = [cx-iconSize/2, cy-iconSize/2];
          icon.render(ctx);
        case "link":
          icon = this.optionIcons[optionSet.link.icon];
          icon.position = [cx-iconSize/2, bubble.p1[1]-iconSize];
          icon.render(ctx);
      }
    }
  }

  drawOptionUI(ctx, bubble) {
    if (this.optionEditActive.angleVector) {
      const [cx, cy] = bubble.center;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + bubble.optionContext.angleVector[0], cy + bubble.optionContext.angleVector[1]);
      ctx.stroke();
    }
    if (this.selected) {
      for (let b of this.bubbles) {
        if (b === this.selected) {continue;}

        if (this.getGroupMaster(b) === this.getGroupMaster(this.selected)) {
          ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
          ctx.lineWidth = 3;
          ctx.moveTo(...b.center);
          ctx.lineTo(...this.selected.center);
          ctx.stroke();
        }
      }
    }
    if (this.optionEditActive.link) {
      ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
      for (let b of this.bubbles) {
        if (b === this.selected) {continue;}
        if (!b.optionSet.link) {continue;}
        if (this.getGroupMaster(b) === this.getGroupMaster(this.selected)) {continue;}
        ctx.lineWidth = 5;
        ctx.strokeRect(...b.p0, ...b.size);
      }

      const [cx, cy] = this.optionIcons[bubble.optionSet.link.icon].center;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + bubble.optionContext.link[0], cy + bubble.optionContext.link[1]);
      ctx.stroke();
    }
  }

  pointerHover(p) {
    if (keyDownFlags["Space"]) {
      return false;
    }

    if (this.createBubbleIcon.hintIfContains(p, this.hint)) {
      return true;      
    }

    if (this.selected) {
      this.handle = this.selected.getHandleAt(p);

      if (this.removeIcon.hintIfContains(p, this.hint) ||
          this.dragIcon.hintIfContains(p, this.hint) ||
          this.zMinusIcon.hintIfContains(p, this.hint) ||
          this.zPlusIcon.hintIfContains(p, this.hint) ||
          this.hintOptionIcon(this.selected.shape, p)) {
            this.handle = null;
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
        this.hint([(x0 + x1) / 2, y0 - 20],"Alt+ドラッグで移動、クリックで選択");
        return true;
      }
    }
    return false;
  }

  keyDown(event) {
    if (event.code === "KeyX" && event.ctrlKey) {
      if (!this.selected) {return false;}
      console.log("cut");
      this.copyBubble();
      this.removeBubble(this.selected);
      return true;
    }
    if (event.code === "KeyC" && event.ctrlKey) {
      if (!this.selected) {return false;}
      console.log("copy");
      this.copyBubble();
      return true;
    }
    if (event.code === "KeyV" && event.ctrlKey) {
      console.log("paste");
      this.pasteBubble();
      return true;
    }
    return false;
  }

  copyBubble() {
    if (this.selected) {
      const t = JSON.stringify(Bubble.decompile(this.getCanvasSize(), this.selected), null, 2);
      navigator.clipboard.writeText(t).then(() => {
        console.log("copied");
      });
    }
  }

  pasteBubble() {
    navigator.clipboard.readText().then((text) => {
      try {
        console.log(text);
        const b = Bubble.compile(this.getCanvasSize(), JSON.parse(text));
        const size = b.size;
        console.log(size);
        const x = Math.random() * (this.canvas.width - size[0]);
        const y = Math.random() * (this.canvas.height - size[1]);
        b.p0 = [x, y];
        b.p1 = [x + size[0], y + size[1]];
        this.bubbles.push(b);
        this.redraw();
      }
      catch (e) {
        console.error(e);
      }
    }).catch(err => {
      console.error('ユーザが拒否、もしくはなんらかの理由で失敗', err);
    });
  }

  removeBubble(bubble) {
    const index = this.bubbles.indexOf(bubble);
    this.bubbles.splice(index, 1);
    for (let b of this.bubbles) {
      if (b.parent === bubble.uuid) {
        b.parent = null;
      }
    }
    this.unfocus();
  }
  
  hintOptionIcon(shape, p) {
    const optionSet = bubbleOptionSets[shape];
    for (const option of Object.keys(optionSet)) {
      if (this.optionIcons[optionSet[option].icon].hintIfContains(p, this.hint)) {
        return true;
      }
    }
    return false;
  }

  isOnOptionIcon(shape, p) {
    const optionSet = bubbleOptionSets[shape];
    for (const option of Object.keys(optionSet)) {
      const icon = this.optionIcons[optionSet[option].icon];
      if (icon.contains(p)) {
        return true;
      }
    }
    return false;
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
      } else {
        const icon = this.getOptionIconAt(bubble.shape, point);
        if (icon) {
          return { action: "options-" + icon, bubble };
        }
      }

      const handle = bubble.getHandleAt(point);
      if (handle) {
        return { action: "resize", bubble, handle };
      }

      const gm = this.getGroupMaster(bubble);
      if (gm.image && bubble.contains(point)) {
        if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) {
          return { action: "image-scale", bubble: gm };
        } else if (!keyDownFlags["AltLeft"] && !keyDownFlags["AltRight"]) {
          return { action: "image-move", bubble: gm };
        }
      }
    }

    for (let bubble of [...this.bubbles].reverse()) {
      if (bubble.contains(point)) {
        if (keyDownFlags["KeyQ"]) {
          return { action: "remove", bubble };
        } else if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
          return { action: "move", bubble };
        } else {
          return { action: "select", bubble };
        }
      }
      const handle = bubble.getHandleAt(point);
      if (handle) {
        return { action: "resize", bubble, handle };
      }
    }

    return null;
  }

  getOptionIconAt(shape, p) {
    const optionSet = bubbleOptionSets[shape];
    for (const option of Object.keys(optionSet)) {
      const icon = this.optionIcons[optionSet[option].icon];
      if (icon.contains(p)) {
        return option;
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

  async *pointer(dragStart, payload) {
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
      this.removeBubble(bubble);
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
    } else if (payload.action === "options-angleVector") {
      yield* this.optionsAngleVector(dragStart, payload.bubble);
    } else if (payload.action === "options-link") {
      yield* this.optionsLink(dragStart, payload.bubble);
    }
  }

  dropped(image, position) {
    for (let bubble of this.bubbles) {
      if (bubble.contains(position)) {
        this.getGroupMaster(bubble).image = { image, translation: [0,0], scale: [1,1] };
        this.redraw();
        return true;
      }
    }
    return false;
  }

  doubleClicked(p) {
    for (let bubble of this.bubbles) {
      if (bubble.contains(p)) {
        return;
      }
    }

    const bubble = this.defaultBubble.clone();
    bubble.p0 = [p[0] - 100, p[1] - 100];
    bubble.p1 = [p[0] + 100, p[1] + 100];
    this.onGetDefaultText().then((text) => {
      bubble.text = text;
      this.bubbles.push(bubble);
      this.onCommit(this.bubbles);
      this.redraw();
    });
    return true;
  }

  setIconPositions() {
    const [x0, y0] = this.selected.p0;
    const [x1, y1] = this.selected.p1;

    this.dragIcon.position = [(x0 + x1) / 2 - iconSize * 0.5, y0 + 4];
    this.zPlusIcon.position = [x0 + 4, y0 + 4];
    this.zMinusIcon.position = [x0 + 4, y0 + 4 + iconSize];
    this.removeIcon.position = [x1 - 4 - iconSize, y0 + 4];
  }

  *optionsAngleVector(p, bubble) {
    console.log("optionsAngleVector");
    this.optionEditActive.angleVector = true;
    const q = p;
    while (p = yield) {
      bubble.optionContext.angleVector = [p[0] - q[0], p[1] - q[1]];
      this.redraw();
    }
    this.optionEditActive.angleVector = false;
    this.redraw();
  }

  *optionsLink(p, bubble) {
    console.log("optionsLink");
    this.optionEditActive.link = true;
    const q = p;
    let drop = null;
    while (p = yield) {
      bubble.optionContext.link = [p[0] - q[0], p[1] - q[1]];
      this.redraw();
      drop = p;
    }

    if (drop) {
      for (let i = this.bubbles.length - 1; 0 <= i; i--) {
        const b = this.bubbles[i];
        if (b !== bubble && b.contains(drop)) {
          if (this.getGroupMaster(bubble) === this.getGroupMaster(b)) {
            b.parent = null;
            this.redraw();
          } else {
            this.mergeGroup(this.getGroup(bubble), this.getGroup(b));
            this.redraw();
          }
          break;
        }
      }
    }

    this.optionEditActive.link = false;
    this.redraw();
  }

  uniteBubble(bubbles) {
    let path = null;
    for (let bubble of bubbles) {
      const [p0, p1] = bubble.regularized();
      const [x, y] = p0;
      const [w, h] = [p1[0] - p0[0], p1[1] - p0[1]];
      const path2 = getPath(bubble.shape, [x, y, w, h], bubble.optionContext, bubble.text);
      path = path ? path.unite(path2) : path2;
    }
    return path;
  }

  getGroup(bubble) {
    const group = [bubble];

    let modified = true;
    while (modified) {
      modified = false;
      for (let i = 0; i < group.length; i++) {
        const b = group[i];
        for (let j = 0; j < this.bubbles.length; j++) {
          const b2 = this.bubbles[j];
          if (b2.linkedTo(b) && !group.includes(b2)) {
            group.push(b2);
            modified = true;
          }
        }
      }
    }

    return group;
  }

  regularizeGroup(g) {
    // parent1つに集約する
    const parent = g[0];
    for (let i = 1; i < g.length; i++) {
      const child = g[i];
      child.linkTo(parent);
    }
  }

  mergeGroup(g1, g2) {
    const g = g1.concat(g2);
    this.regularizeGroup(g);
  }

  getGroupMaster(bubble) {
    if (bubble.parent) {
      return this.bubbles.find((b) => b.uuid === bubble.parent);
    }
    return bubble;
  }

}

