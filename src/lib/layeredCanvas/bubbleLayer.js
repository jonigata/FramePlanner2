import { Layer } from "./layeredCanvas.js";
import { keyDownFlags } from "./keyCache.js";
import { measureHorizontalText, measureVerticalText } from "./drawText.js";
import { getPath } from "./bubbleGraphic";
import { ClickableIcon, MultistateIcon } from "./clickableIcon.js";
import { Bubble, bubbleOptionSets } from "./bubble.js";
import { tailCoordToWorldCoord, worldCoordToTailCoord } from "./bubbleGeometry.js";
import { translate, scale } from "./pictureControl.js";
import { add2D } from "./geometry.js";
import { v4 as uuidv4 } from 'uuid';
import * as paper from 'paper';

const iconUnit = [20, 20];

export class BubbleLayer extends Layer {
  constructor(
    renerLayer,
    interactable,
    frameLayer,
    onShowInspector,
    onHideInspector,
    onCommit,
    onRevert,
    onGetDefaultText
  ) {
    super();
    this.renderLayer = renerLayer;
    this.interactable = interactable;
    this.frameLayer = frameLayer;
    this.bubbles = [];
    this.onShowInspector = onShowInspector;
    this.onHideInspector = onHideInspector;
    this.onCommit = onCommit;
    this.onRevert = onRevert;
    this.onGetDefaultText = onGetDefaultText;
    this.defaultBubble = new Bubble();
    this.creatingBubble = null;
    this.optionEditActive = {}

    this.selected = null;
    this.lit = null;

    const unit = iconUnit;
    this.createBubbleIcon = new ClickableIcon("bubble.png",[64,64],[0,1],"ドラッグで作成", () => this.interactable);

    this.dragIcon = new ClickableIcon("drag.png",unit,[0.5,0],"ドラッグで移動", () => this.interactable && this.selected);
    this.offsetIcon = new ClickableIcon("bubble-offset.png",unit,[0.5,0],"ドラッグで位置調整", () => this.interactable && this.selected);
    this.zPlusIcon = new ClickableIcon("bubble-zplus.png",unit,[0,0],"フキダシ順で手前", () => this.interactable && this.selected);
    this.zMinusIcon = new ClickableIcon("bubble-zminus.png",unit,[0,0],"フキダシ順で奥", () => this.interactable && this.selected);
    this.removeIcon = new ClickableIcon("remove.png",unit,[1,0],"削除", () => this.interactable && this.selected);
    this.rotateIcon = new ClickableIcon("bubble-rotate.png",unit,[0.5,1],"左右ドラッグで回転", () => this.interactable && this.selected);

    this.imageDropIcon = new ClickableIcon("bubble-drop.png",unit,[0,1],"画像除去", () => this.interactable && this.selected?.image);
    this.imageScaleLockIcon = new MultistateIcon(["bubble-unlock.png","bubble-lock.png"],unit,[1,1], "スケール同期", () => this.interactable && this.selected?.image);
    this.imageScaleLockIcon.index = 0;

    this.optionIcons = {};
    this.optionIcons.tail = new ClickableIcon("tail-tip.png",unit,[0.5,0.5],"ドラッグでしっぽ", () => this.interactable && this.selected);
    this.optionIcons.curve = new ClickableIcon("tail-mid.png",unit,[0.5,0.5],"ドラッグでしっぽのカーブ", () => this.interactable && this.selected);
    this.optionIcons.unite = new ClickableIcon("unite.png",unit,[0.5,1],"ドラッグで他のフキダシと結合", () => this.interactable && this.selected);
    this.optionIcons.circle = new ClickableIcon("circle.png",unit,[0.5,0.5],"ドラッグで円定義", () => this.interactable && this.selected);
    this.optionIcons.radius = new ClickableIcon("radius.png",unit,[0.5,0.5],"ドラッグで円半径", () => this.interactable && this.selected);
  }

  prerender(ctx) {
    const bubbles = [...this.bubbles];
    if (this.creatingBubble) {
      bubbles.push(this.creatingBubble);
    }
    this.renderLayer.setBubbles(bubbles);
  }

  render(ctx) {
    this.createBubbleIcon.render(ctx);
    this.dragIcon.render(ctx);
    this.offsetIcon.render(ctx);

    this.zPlusIcon.render(ctx);
    this.zMinusIcon.render(ctx);
    this.removeIcon.render(ctx);
    this.rotateIcon.render(ctx);

    this.imageDropIcon.render(ctx);
    this.imageScaleLockIcon.render(ctx);

    if (this.interactable && this.lit) {
      this.drawLitUI(ctx, this.lit);
    }

    if (this.interactable && this.selected) {
      try {
        this.drawSelectedUI(ctx, this.selected);
        this.drawOptionHandles(ctx, this.selected);
        this.drawOptionUI(ctx, this.selected);
      }
      catch (e) {
        console.log(e, this.optionEditActive, this.selected, this.selected?.optionContext);
        throw e;
      }
    }
  }

  drawLitUI(ctx, bubble) {
    const [x, y, w, h] = bubble.regularizedPositionAndSize();

    // 選択枠描画
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  drawSelectedUI(ctx, bubble) {
    const [x, y, w, h] = bubble.regularizedPositionAndSize();

    // 選択枠描画
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
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
    const [cx,cy] = bubble.center;
    const cp = (ro, ou) => ClickableIcon.calcPosition([...bubble.p0,...bubble.size], iconUnit, ro, ou);
    const rp = (p) => [cx + p[0], cy + p[1]];
    const tailMidCoord = () => tailCoordToWorldCoord(bubble.center, bubble.optionContext.tailTip, bubble.optionContext.tailMid);

    const optionSet = bubble.optionSet;
    for (const option of Object.keys(optionSet)) {
      let icon;
      switch (option) {
        case "tailTip":
          icon = this.optionIcons[optionSet.tailTip.icon];
          icon.position = rp(bubble.optionContext.tailTip);
          icon.render(ctx);
          break;
        case "tailMid":
          (() => {
            icon = this.optionIcons[optionSet.tailMid.icon];
            icon.position = tailMidCoord();
            icon.render(ctx);
          })();
          break;
        case "link":
          icon = this.optionIcons[optionSet.link.icon];
          icon.position = cp([0.5,1],[0,0]);
          icon.render(ctx);
          break;
        case "focalPoint":
          icon = this.optionIcons[optionSet.focalPoint.icon];
          icon.position = rp(bubble.optionContext.focalPoint);
          icon.render(ctx);
          break;
        case "focalRange":
          (() => {
            icon = this.optionIcons[optionSet.focalRange.icon];
            const [px, py] = rp(bubble.optionContext.focalPoint);
            const [rx, ry] = bubble.optionContext.focalRange;
            icon.position = [px+rx, py+ry];
            icon.render(ctx);
          })();
          break;
      }
    }
  }

  drawOptionUI(ctx, bubble) {
    if (this.optionEditActive.tail) {
      const [cx, cy] = bubble.center;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + bubble.optionContext.tailTip[0], cy + bubble.optionContext.tailTip[1]);
      ctx.stroke();
    } 
    if (this.optionEditActive.focal) {
      const [cx, cy] = bubble.center;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.beginPath();
      const fp = bubble.optionContext.focalPoint;
      const [px, py] = [cx + fp[0], cy + fp[1]];
      ctx.moveTo(px, py);
      ctx.lineTo(px + bubble.optionContext.focalRange[0], py + bubble.optionContext.focalRange[1]);
      ctx.stroke();
    }

    for (let b of this.bubbles) {
      if (b === bubble) {continue;}

      if (this.getGroupMaster(b) === this.getGroupMaster(bubble)) {
        ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(...b.center);
        ctx.lineTo(...bubble.center);
        ctx.stroke();
      }
    }

    if (this.optionEditActive.link) {
      ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
      for (let b of this.bubbles) {
        if (b === bubble) {continue;}
        if (!b.optionSet.link) {continue;}
        if (this.getGroupMaster(b) === this.getGroupMaster(bubble)) {continue;}
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

    this.lit = null;

    if (this.createBubbleIcon.hintIfContains(p, this.hint)) {
      return true;      
    }

    if (this.selected) {
      this.handle = this.selected.getHandleAt(p);

      if (this.removeIcon.hintIfContains(p, this.hint) ||
        this.rotateIcon.hintIfContains(p, this.hint) ||
        this.dragIcon.hintIfContains(p, this.hint) ||
        this.offsetIcon.hintIfContains(p, this.hint) ||
        this.zMinusIcon.hintIfContains(p, this.hint) ||
        this.zPlusIcon.hintIfContains(p, this.hint) ||
        this.imageDropIcon.hintIfContains(p, this.hint) ||
        this.imageScaleLockIcon.hintIfContains(p, this.hint) ||
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
        this.lit = bubble;
        this.redraw();
        return true;
      }
    }
    return false;
  }

  keyDown(event) {
    if (!this.interactable) {return false;}

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
      const t = Bubble.decompile(this.getPaperSize(), this.selected);
      navigator.clipboard.writeText(JSON.stringify(t, null, 2)).then(() => {
        console.log("copied");
      });
    }
  }

  pasteBubble() {
    navigator.clipboard.read().then((items) => {
      for (let item of items) {
        for (let type of item.types) {
          console.log(type);
          if (type === "text/plain") {
            item.getType(type).then((blob) => {
              blob.text().then((text) => {
                this.createTextBubble(text);
              });
            });
          } else if (type.startsWith("image/")) {
            item.getType(type).then((blob) => {
              const url = URL.createObjectURL(blob);
              const image = new Image();
              image.src = url;
              this.createImageBubble(image);
            });
          }
        }
      }
    }).catch(err => {
      console.error('ユーザが拒否、もしくはなんらかの理由で失敗', err);
    });
  }

  createTextBubble(text) {
    try {
      const paperSize = this.getPaperSize();
      const b = Bubble.compile(paperSize, JSON.parse(text));
      b.parent = null;
      b.uuid = uuidv4();
      const size = b.size;
      const x = Math.random() * (paperSize[0] - size[0]);
      const y = Math.random() * (paperSize[1] - size[1]);
      b.p0 = [x, y];
      b.p1 = [x + size[0], y + size[1]];
      this.bubbles.push(b);
      this.selectBubble(b);
    }
    catch (e) {
      console.log(e);
      const paperSize = this.getPaperSize();
      let cursorX = 10;
      let cursorY = 10;
      let lineHeight = 0;
      let lastBubble = null;
      for (let s of text.split(/\n\s*\n/)) {
        const size = this.calculateFitBubbleSize(s, this.defaultBubble);
        const b = this.defaultBubble.clone();
        b.image = null;

        if (cursorX + size[0] > paperSize[0]) {
          cursorX = 10;
          cursorY += lineHeight + 10;
          lineHeight = 0;
        }
        const x = cursorX;
        const y = cursorY;

        b.p0 = [x, y];
        b.p1 = [x + size[0], y + size[1]];
        b.text = s;
        b.initOptions();
        this.bubbles.push(b);
        cursorX += size[0] + 10;
        lineHeight = Math.max(lineHeight, size[1]);
        lastBubble = b;
      }
      this.selectBubble(lastBubble);
    }
  }

  calculateFitBubbleSize(s, bubble) {
    const baselineSkip = bubble.fontSize * 1.5;
    const charSkip = bubble.fontSize;
    const ctx = this.context;
    let size =[0,0];
    if (bubble.direction == 'v') {
      const m = measureVerticalText(ctx, Infinity, s, baselineSkip, charSkip, false);
      size = [Math.floor(m.width*1.2), Math.floor(m.height*1.4)];
    } else {
      const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${bubble.fontSize}px '${bubble.fontFamily}'`;
      ctx.font = ss;
      const m = measureHorizontalText(ctx, Infinity, s, baselineSkip, false);
      size = [Math.floor(m.width*1.4), Math.floor(m.height*1.2)];
    }
    return Bubble.forceEnoughSize(size);
  }

  createImageBubble(image) {
    const bubble = new Bubble();
    const paperSize = this.getPaperSize();
    const imageSize = [image.naturalWidth, image.naturalHeight];
    const x = Math.random() * (paperSize[0] - imageSize[0]);
    const y = Math.random() * (paperSize[1] - imageSize[1]);
    bubble.p0 = [x, y];
    bubble.p1 = [x + imageSize[0], y + imageSize[1]];
    bubble.forceEnoughSize();
    bubble.shape = "none";
    bubble.initOptions();
    bubble.text = "";
    bubble.image = { image, translation: [0,0], scale: [1,1], scaleLock: true };
    this.bubbles.push(bubble);
    this.onCommit(this.bubbles);
    this.selectBubble(bubble);
    console.log(bubble.p0, bubble.p1);
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
      } else if (this.rotateIcon.contains(point)) {
        return { action: "rotate", bubble };
      } else if (this.dragIcon.contains(point)) {
        return { action: "move", bubble };
      } else if (this.offsetIcon.contains(point)) {
        return { action: "offset", bubble };
      } else if (this.zMinusIcon.contains(point)) {
        return { action: "z-minus", bubble };
      } else if (this.zPlusIcon.contains(point)) {
        return { action: "z-plus", bubble };
      } else if (this.imageDropIcon.contains(point)) {
        return { action: "image-drop", bubble };
      } else if (this.imageScaleLockIcon.contains(point)) {
        return { action: "image-scale-lock", bubble };
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
      yield* this.createBubble(dragStart);
    } else if (payload.action === "move") {
      yield* this.moveBubble(dragStart, payload.bubble);
    } else if (payload.action === "offset") {
      yield* this.offsetBubbleText(dragStart, payload.bubble);
    } else if (payload.action === "select") {
      this.selectBubble(payload.bubble);
    } else if (payload.action === "resize") {
      yield* this.resizeBubble(dragStart, payload.bubble, payload.handle);
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
    } else if (payload.action === "rotate") {
      yield* this.rotateBubble(dragStart, payload.bubble);
    } else if (payload.action === "image-drop") {
      const bubble = payload.bubble;
      bubble.image = null;
      this.redraw();
    } else if (payload.action === "image-scale-lock") {
      console.log("image-scale-lock");
      this.toggleScaleLock(payload.bubble);
    } else if (payload.action === "image-move") {
      yield* this.translateImage(dragStart, payload.bubble);
    } else if (payload.action === "image-scale") {
      yield* this.scaleImage(dragStart, payload.bubble);
    } else if (payload.action === "options-tailTip") {
      yield* this.optionsTailTip(dragStart, payload.bubble);
    } else if (payload.action === "options-tailMid") {
      yield* this.optionsTailMid(dragStart, payload.bubble);
    } else if (payload.action === "options-link") {
      yield* this.optionsLink(dragStart, payload.bubble);
    } else if (payload.action === "options-focalPoint") {
      yield* this.optionsFocalPoint(dragStart, payload.bubble);
    } else if (payload.action === "options-focalRange") {
      yield* this.optionsFocalRange(dragStart, payload.bubble);
    }
  }

  dropped(image, position) {
    if (!this.interactable) { return; }

    if (this.createBubbleIcon.contains(position)) {
      this.createImageBubble(image);
      return;
    }

    for (let bubble of this.bubbles) {
      if (bubble.contains(position)) {
        this.getGroupMaster(bubble).image = { image, translation: [0,0], scale: [1,1], scaleLock: false };
        this.redraw();
        return true;
      }
    }
    return false;
  }

  doubleClicked(p) {
    if (!this.interactable) { return false; }

    for (let bubble of this.bubbles) {
      if (bubble.contains(p)) {
        bubble.size = this.calculateFitBubbleSize(bubble.text, bubble);
        this.onCommit(this.bubbles);
        return;
      }
    }

    const bubble = this.defaultBubble.clone();
    bubble.p0 = [p[0] - 100, p[1] - 100];
    bubble.p1 = [p[0] + 100, p[1] + 100];
    bubble.initOptions();
    this.onGetDefaultText().then((text) => {
      bubble.text = text;
      this.bubbles.push(bubble);
      this.onCommit(this.bubbles);
      this.selectBubble(bubble);
    });
    return true;
  }

  setIconPositions() {
    const rect = [this.selected.p0[0] + 10, this.selected.p0[1] + 10, this.selected.size[0] - 20, this.selected.size[1] - 20];
    const cp = (ro, ou) => ClickableIcon.calcPosition(rect, iconUnit, ro, ou);

    this.dragIcon.position = cp([0.5, 0], [0, 0]);
    this.offsetIcon.position = add2D(cp([0.5, 0.25], [0, 0]), this.selected.offset);
    this.zPlusIcon.position = cp([0,0], [1,0]);
    this.zMinusIcon.position = cp([0,0], [0,0]);
    this.removeIcon.position = cp([1,0], [0, 0]);
    this.rotateIcon.position = cp([0.5,0], [0,-1]);

    this.imageDropIcon.position = cp([0,1],[0,0]);
    this.imageScaleLockIcon.position = cp([1,1],[0,0]);
    this.imageScaleLockIcon.index = this.selected.image?.scaleLock ? 1 : 0;
  }

  async *createBubble(dragStart) {
    this.unfocus();
    const bubble = this.defaultBubble.clone();
    bubble.p0 = dragStart;
    bubble.p1 = dragStart;
    bubble.text = await this.onGetDefaultText();
    bubble.initOptions();
    this.creatingBubble = bubble;

    let p;
    try {
      while ((p = yield)) {
        bubble.p1 = p;
        this.redraw();
      }

      this.creatingBubble = null;
      bubble.regularize();
      if (bubble.hasEnoughSize()) {
        this.bubbles.push(bubble);
        this.onCommit(this.bubbles);
        // this.selectBubble(bubble);
      }
    } catch (e) {
      if (e === "cancel") {
        this.creatingBubble = null;
      }
    }
  }

  *moveBubble(dragStart, bubble) {
    const [dx, dy] = [dragStart[0] - bubble.p0[0], dragStart[1] - bubble.p0[1]];
    const [w, h] = [bubble.p1[0] - bubble.p0[0], bubble.p1[1] - bubble.p0[1]];

    let p;
    try {
      while ((p = yield)) {
        bubble.p0 = [p[0] - dx, p[1] - dy];
        bubble.p1 = [bubble.p0[0] + w, bubble.p0[1] + h];
        if (bubble === this.selected) {
          this.setIconPositions();
        }
        this.redraw();
      }
      this.onCommit(this.bubbles);
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  *rotateBubble(dragStart, bubble) {
    const originalRotation = bubble.rotation;
    const s = dragStart;

    let p;
    try {
      while ((p = yield)) {
        const op = -(p[0] - s[0]);
        bubble.rotation = Math.max(-180, Math.min(180, originalRotation + op * 0.2));
        this.redraw();
      }
      this.onCommit(this.bubbles);
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  *offsetBubbleText(dragStart, bubble) {
    const q = bubble.offset;
    let p;
    try {
      while ((p = yield)) {
        bubble.offset = [q[0] + p[0] - dragStart[0], q[1] + p[1] - dragStart[1]];
        if (bubble === this.selected) {
          this.setIconPositions();
        }
        this.redraw();
      }
      this.onCommit(this.bubbles);
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  *resizeBubble(dragStart, bubble, handle) {
    const oldRect = [bubble.p0, bubble.p1];
    let p;
    try {
      const [q0, q1] = [bubble.p0, bubble.p1];
      while ((p = yield)) {
        this.resizeBubbleAux(bubble, handle, q0, q1, p);

        if (bubble.image?.scaleLock) {
          // イメージの位置を中央に固定し、フキダシの大きさにイメージを合わせる
          bubble.image.translation = [0,0];
          bubble.image.scale = [bubble.size[0] / bubble.image.image.naturalWidth, bubble.size[1] / bubble.image.image.naturalHeight];
        }
  
        this.setIconPositions();
        this.redraw();
      }
      bubble.regularize();
      if (!bubble.hasEnoughSize()) {
        throw "cancel";
      }
      console.log(bubble.image);
      this.onCommit(this.bubbles);
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  resizeBubbleAux(bubble, handle, q0, q1, p) {
    if (bubble.image?.scaleLock) {
      const [cx, cy] = [(bubble.p0[0] + bubble.p1[0]) / 2, (bubble.p0[1] + bubble.p1[1]) / 2];
      const originalSize = [q1[0] - q0[0], q1[1] - q0[1]];
      let w,h, scale;
      switch (handle) {
        case "top-left":
          bubble.p0 = [p[0], p[1]];
          [w,h] = this.resizeWithFixedAspectRatio(originalSize, bubble.size);
          bubble.p0 = [bubble.p1[0] - w, bubble.p1[1] - h];
          break;
        case "top-right":
          bubble.p0 = [bubble.p0[0], p[1]];
          bubble.p1 = [p[0], bubble.p1[1]];
          [w,h] = this.resizeWithFixedAspectRatio(originalSize, bubble.size);
          bubble.p0 = [bubble.p0[0], bubble.p1[1] - h];
          bubble.p1 = [bubble.p0[0] + w, bubble.p1[1]];
          break;
        case "bottom-left":
          bubble.p0 = [p[0], bubble.p0[1]];
          bubble.p1 = [bubble.p1[0], p[1]];
          [w,h] = this.resizeWithFixedAspectRatio(originalSize, bubble.size);
          bubble.p0 = [bubble.p1[0] - w, bubble.p0[1]];
          bubble.p1 = [bubble.p1[0], bubble.p0[1] + h];
          break;
        case "bottom-right":
          bubble.p1 = [p[0], p[1]];
          [w,h] = this.resizeWithFixedAspectRatio(originalSize, bubble.size);
          bubble.p1 = [bubble.p0[0] + w, bubble.p0[1] + h];
          break;
        case "top":
          bubble.p0 = [q0[0], p[1]];
          bubble.p1 = [...q1];
          scale = bubble.size[1] / originalSize[1];
          [w, h] = [originalSize[0] * scale, bubble.size[1]];
          bubble.p0 = [cx - w / 2, bubble.p1[1] - h];
          bubble.p1 = [cx + w / 2, bubble.p1[1]];
          break;
        case "bottom":
          bubble.p0 = [...q0];
          bubble.p1 = [q1[0], p[1]];
          scale = bubble.size[1] / originalSize[1];
          [w, h] = [originalSize[0] * scale, bubble.size[1]];
          bubble.p0 = [cx - w / 2, bubble.p0[1]];
          bubble.p1 = [cx + w / 2, bubble.p0[1] + h];
          break;
        case "left":
          bubble.p0 = [p[0], q0[1]];
          bubble.p1 = [...q1];
          scale = bubble.size[0] / originalSize[0];
          [w, h] = [bubble.size[0], originalSize[1] * scale];
          bubble.p0 = [bubble.p1[0] - w, cy - h / 2];
          bubble.p1 = [bubble.p1[0], cy + h / 2];
          break;
        case "right":
          bubble.p0 = [...q0];
          bubble.p1 = [p[0], q1[1]];
          scale = bubble.size[0] / originalSize[0];
          [w, h] = [bubble.size[0], originalSize[1] * scale];
          bubble.p0 = [bubble.p0[0], cy - h / 2];
          bubble.p1 = [bubble.p0[0] + w, cy + h / 2];
          break;
      }    
    } else {
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
    }
  }    

  *translateImage(dragStart, bubble) {
    const origin = bubble.image.translation;

    try {
      yield* translate(dragStart, (q) => {
        bubble.image.translation = [origin[0] + q[0], origin[1] + q[1]];
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        bubble.image.translation = origin;
        this.redraw();
      }
    }
  }


  *scaleImage(dragStart, bubble) {
    const origin = bubble.image.scale[0];

    try {
      yield* scale(this.getPaperSize(), dragStart, (q) => {
        const s = Math.max(q[0], q[1]);
        bubble.image.scale = [origin * s, origin * s];
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        bubble.image.scale = [origin, origin];
        this.redraw();
      }
    }
  }

  *optionsTailTip(p, bubble) {
    const s = bubble.optionContext.tailTip;
    try {
      const q = p;
      while (p = yield) {
        this.optionEditActive.tail = true;
        bubble.optionContext.tailTip = [s[0] + p[0] - q[0], s[1] + p[1] - q[1]];
        this.redraw();
      }
    } catch (e) {
      console.log(e);
      if (e === "cancel") {
        bubble.optionContext.tailTip = [0,0];
      }
    } finally {
      this.optionEditActive.tail = false;
      this.redraw();
    }
  }

  *optionsTailMid(p, bubble) {
    console.log("optionsTailMid");
    // bubble.centerを原点(O)とし、
    // X軸: O->tailTip Y軸: O->pependicular(O->tailTip)座標系の座標
    // この座標系をtail座標系と呼ぶ
    const s = bubble.optionContext.tailMid;
    try {
      while (p = yield) {
        this.optionEditActive.tail = true;
        bubble.optionContext.tailMid = worldCoordToTailCoord(bubble.center, bubble.optionContext.tailTip, p);
        this.redraw();
      }
    } catch (e) {
      console.log(e);
      if (e === "cancel") {
        bubble.optionContext.tailMid = s;
        this.redraw();
      }
    } finally {
      this.optionEditActive.tail = false;
      this.redraw();
    }
  }

  *optionsLink(p, bubble) {
    try {
      const q = p;
      let drop = null;
      while (p = yield) {
        this.optionEditActive.link = true;
        bubble.optionContext.link = [p[0] - q[0], p[1] - q[1]];
        this.redraw();
        drop = p;
      }

      if (drop) {
        console.log("drop");
        for (let i = this.bubbles.length - 1; 0 <= i; i--) {
          const b = this.bubbles[i];
          if (b !== bubble && b.contains(drop) && b.canLink()) {
            if (this.getGroupMaster(bubble) === this.getGroupMaster(b)) {
              if (b.parent) {
                b.parent = null;
              } else {
                bubble.parent = null;
              }
              this.redraw();
            } else {
              this.mergeGroup(this.getGroup(bubble), this.getGroup(b));
              this.redraw();
            }
            break;
          }
        }
      }
    } catch (e) {
      if (e === "cancel") {
        bubble.optionContext.link = [0,0];
      }
    } finally {
      this.optionEditActive.link = false;
      this.redraw();
    }
  }

  *optionsFocalPoint(p, bubble) {
    const s = bubble.optionContext.focalPoint;
    try {
      const q = p;
      while (p = yield) {
        this.optionEditActive.focal = true;
        bubble.optionContext.focalPoint = [s[0] + p[0] - q[0], s[1] + p[1] - q[1]];
        this.redraw();
      }
    } catch (e) {
      if (e === "cancel") {
        bubble.optionContext.focalPoint = s;
        this.redraw();
      }
    } finally {
      this.optionEditActive.focal = false;
      this.redraw();
    }
  }

  *optionsFocalRange(p, bubble) {
    const s = bubble.optionContext.focalRange;
    try {
      const q = p;
      while (p = yield) {
        this.optionEditActive.focal = true;
        bubble.optionContext.focalRange = [s[0] + p[0] - q[0], s[1] + p[1] - q[1]];
        this.redraw();
      }
    } catch (e) {
      if (e === "cancel") {
        bubble.optionContext.focalRange = s;
        this.redraw();
      }
    } finally {
      this.optionEditActive.focal = false;
      this.redraw();
    }
  }

  uniteBubble(bubbles) {
    let path = null;
    for (let bubble of bubbles) {
      const [x, y, w, h] = bubble.regularizedPositionAndSize();
      const path2 = getPath(bubble.shape, [x, y, w, h], bubble.optionContext, bubble.text);
      if (path2) {
        path2.rotate(-bubble.rotation, bubble.center);
        path = path ? path.unite(path2) : path2;
      } else {
        // シェイプ変更などでリンクが解けている
        for (let b of bubbles) {
          b.parent = null;
        }
        return null;
      }
    }
    path.rotate(bubbles[0].rotation, bubbles[0].center);
    path.translate(new paper.Point(bubbles[0].center).multiply(-1));
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
      const parent =  this.bubbles.find((b) => b.uuid === bubble.parent);
      if (parent) {return parent;}
    }
    return bubble;
  }

  resizeWithFixedAspectRatio(originalSize, newSize) {
    const [originalWidth, originalHeight] = originalSize;
    const [newWidth, newHeight] = newSize;
  
    const scaleFactorX = newWidth / originalWidth;
    const scaleFactorY = newHeight / originalHeight;
  
    const dominantScaleFactor = Math.max(scaleFactorX, scaleFactorY);
  
    const scaledWidth = Math.round(originalWidth * dominantScaleFactor);
    const scaledHeight = Math.round(originalHeight * dominantScaleFactor);
  
    return [scaledWidth, scaledHeight];
  }

  toggleScaleLock(bubble) {
    bubble.image.scaleLock = !bubble.image.scaleLock;
    this.imageScaleLockIcon.index = bubble.image.scaleLock ? 1 : 0;
    if (bubble.image.scaleLock) {
      const [w,h] = this.resizeWithFixedAspectRatio(bubble.imageSize, bubble.size);
      const [cx,cy] = bubble.center;
      bubble.p0 = [cx - w/2, cy - h/2];
      bubble.p1 = [cx + w/2, cy + h/2];
      bubble.image.scale = [w / bubble.imageSize[0], h / bubble.imageSize[1]];
      this.setIconPositions();
    }
    this.redraw();
  }

  selectBubble(bubble) {
    for (let a of Object.keys(this.optionEditActive)) {
      if (this.optionEditActive[a]) {
        this.redraw();
        return;
      }
    }

    this.unfocus();
    this.selected = bubble;
    this.setIconPositions();
    this.onShowInspector(this.selected);

    this.redraw();
  }
}

