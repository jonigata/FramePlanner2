import { type Layer, LayerBase, sequentializePointer, type Viewport, type Picked } from "../system/layeredCanvas";
import { keyDownFlags } from "../system/keyCache";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { Bubble, bubbleOptionSets } from "../dataModels/bubble";
import type { RectHandle } from "../tools/rectHandle";
import { tailCoordToWorldCoord, worldCoordToTailCoord } from "../tools/geometry/bubbleGeometry";
import { translate, scale } from "../tools/pictureControl";
import { type Vector, type Rect, add2D, scale2D, computeConstraintedRect, scaleRect, minimumBoundingScale, getRectCenter } from "../tools/geometry/geometry";
import { getHaiku } from '../tools/haiku';
import type { PaperRendererLayer } from "./paperRendererLayer";
import { ulid } from 'ulid';
import { type Trapezoid, rectToTrapezoid } from "../tools/geometry/trapezoid";
import { Film, FilmStackTransformer, calculateMinimumBoundingRect } from "../dataModels/film";
import { ImageMedia, VideoMedia } from "../dataModels/media";
import { drawFilmStackBorders } from "../tools/draw/drawFilmStack";
import type { FocusKeeper } from "../tools/focusKeeper";
import { createCanvasFromBlob, makePlainCanvas } from "../tools/imageUtil";
import { drawSelectionFrame, calculateSheetRect, drawSheet } from "../tools/draw/selectionFrame";
import { Grid } from "../tools/grid";

const iconUnit: Vector = [26, 26];
const SHEET_Y_MARGIN = 32;

export class DefaultBubbleSlot {
  bubble: Bubble;
  constructor(bubble: Bubble) {
    this.bubble = bubble;
  }
}

export class BubbleLayer extends LayerBase {
  viewport: Viewport;
  focusKeeper: FocusKeeper;
  renderLayer: PaperRendererLayer;
  bubbles: Bubble[];
  fold: number = 0;
  onFocus: (bubble: Bubble | null) => void;
  onCommit: (weak?: boolean) => void;
  onRevert: () => void;
  onPotentialCrossPage: (bubble: Bubble) => void;
  defaultBubbleSlot: DefaultBubbleSlot;
  creatingBubble: Bubble | null;
  optionEditActive: Record<string, boolean>;
  selected: Bubble | null;
  lit: Bubble | null;
  handle: RectHandle | null; // サイズをドラッグするときのハンドル

  createBubbleIcon: ClickableIcon;
  dragIcon: ClickableIcon;
  offsetIcon: ClickableIcon;
  zPlusIcon: ClickableIcon;
  zMinusIcon: ClickableIcon;
  removeIcon: ClickableIcon;
  rotateIcon: ClickableIcon;
  imageScaleLockIcon: ClickableIcon;
  scaleIcon: ClickableIcon;
  optionIcons: Record<string, ClickableIcon>;

  constructor(
    viewport: Viewport,
    focusKeeper: FocusKeeper,
    renderLayer: PaperRendererLayer,
    defaultBubbleSlot: DefaultBubbleSlot,
    bubbles: Bubble[],
    fold: number,
    onFocus: (bubble: Bubble | null) => void,
    onCommit: (weak?: boolean) => void,
    onRevert: () => void,
    onPotentialCrossPage: (bubble: Bubble) => void) {

    super();
    this.viewport = viewport;
    this.focusKeeper = focusKeeper;
    this.renderLayer = renderLayer;
    this.bubbles = bubbles;
    this.onFocus = onFocus;
    this.onCommit = onCommit;
    this.onRevert = onRevert;
    this.onPotentialCrossPage = onPotentialCrossPage;
    this.defaultBubbleSlot = defaultBubbleSlot;
    this.creatingBubble = null;
    this.optionEditActive = {}

    this.selected = null;
    this.lit = null;
    this.handle = null;

    const unit = iconUnit;
    const mp = () => this.paper.matrix;
    this.createBubbleIcon = new ClickableIcon(["bubbleLayer/bubble.webp"],[64,64],[0,1],"ドラッグで作成", () => this.interactable, mp);
    this.createBubbleIcon.position = [0, -16];

    this.dragIcon = new ClickableIcon(["bubbleLayer/drag.webp"],unit,[0.5,0],"ドラッグで移動", () => this.interactable && this.selected != null, mp);
    this.offsetIcon = new ClickableIcon(["bubbleLayer/bubble-offset.webp"],unit,[0.5,0],"ドラッグで位置調整", () => this.interactable && this.selected != null, mp);
    this.zPlusIcon = new ClickableIcon(["bubbleLayer/bubble-zplus.webp"],unit,[0,0],"フキダシ順で手前", () => this.interactable && this.selected != null, mp);
    this.zMinusIcon = new ClickableIcon(["bubbleLayer/bubble-zminus.webp"],unit,[0,0],"フキダシ順で奥", () => this.interactable && this.selected != null, mp);
    this.removeIcon = new ClickableIcon(["bubbleLayer/remove.webp"],unit,[1,0],"削除", () => this.interactable && this.selected != null, mp);
    this.rotateIcon = new ClickableIcon(["bubbleLayer/bubble-rotate.webp"],unit,[0.5,1],"左右ドラッグで回転", () => this.interactable && this.selected != null, mp);

    this.imageScaleLockIcon = new ClickableIcon(["bubbleLayer/bubble-unlock.webp","bubbleLayer/bubble-lock.webp"],unit,[1,1], "スケール同期", () => this.interactable && 0 < (this.selected?.filmStack.films.length ?? 0), mp);
    this.imageScaleLockIcon.index = 0;
    this.scaleIcon = new ClickableIcon(["bubbleLayer/bubble-scale.webp"],unit,[1,1],"ドラッグでスケール", () => this.interactable && this.selected != null && 0 < this.selected?.filmStack.films.length, mp);

    this.optionIcons = {};
    this.optionIcons.tail = new ClickableIcon(["bubbleLayer/tail-tip.webp"],unit,[0.5,0.5],"ドラッグでしっぽ", () => this.interactable && this.selected != null, mp);
    this.optionIcons.curve = new ClickableIcon(["bubbleLayer/tail-mid.webp"],unit,[0.5,0.5],"ドラッグでしっぽのカーブ", () => this.interactable && this.selected != null, mp);
    this.optionIcons.unite = new ClickableIcon(["bubbleLayer/unite.webp"],unit,[0.5,1],"ドラッグで他のフキダシと結合", () => this.interactable && this.selected != null, mp);
    this.optionIcons.circle = new ClickableIcon(["bubbleLayer/circle.webp"],unit,[0.5,0.5],"ドラッグで円定義", () => this.interactable && this.selected != null, mp);
    this.optionIcons.radius = new ClickableIcon(["bubbleLayer/radius.webp"],unit,[0.5,0.5],"ドラッグで円半径", () => this.interactable && this.selected != null, mp);

    for (let icon of [this.dragIcon, this.zPlusIcon, this.zMinusIcon, this.removeIcon, this.rotateIcon, this.imageScaleLockIcon, this.scaleIcon]) {
      if (icon instanceof ClickableIcon) {
        icon.shadowColor = "#242";
      }
    }
    for (let icon of [this.optionIcons.circle, this.optionIcons.radius]) {
      if (icon instanceof ClickableIcon) {
        icon.shadowColor = "#842";
      }
    }
    for (let icon of [this.offsetIcon, this.optionIcons.tail, this.optionIcons.curve, this.optionIcons.unite]) {
      if (icon instanceof ClickableIcon) {
        icon.shadowColor = "#fff";
      }
    }

    this.setFold(fold);

    focusKeeper.subscribe(this.changeFocus.bind(this));
  }

  rebuildPageLayouts(matrix: DOMMatrix): void {
    if (this.selected != null) {
      this.relayoutIcons();
    }
  }

  renderDepths(): number[] { return [1,2]; }

  acceptDepths(): number[] {
    return [1,2];
  }

  prerender(): void {
    const bubbles = [...this.bubbles];
    if (this.creatingBubble) {
      bubbles.push(this.creatingBubble);
    }
    this.renderLayer.setBubbles(bubbles);
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.interactable) { return; }
    if (depth === 2) {
      this.renderSelected(ctx);
    } else {
      this.renderOthers(ctx);
    }
  }

  renderSelected(ctx: CanvasRenderingContext2D): void {
    if (this.selected) {
      try {
        this.drawSheet(ctx, this.selected.getPhysicalRegularizedRect(this.getPaperSize()));
        this.drawSelectedUI(ctx, this.selected);
        this.drawOptionHandles(ctx, this.selected);
        this.drawOptionUI(ctx, this.selected);

        this.dragIcon.render(ctx);
        this.offsetIcon.render(ctx);
    
        this.zPlusIcon.render(ctx);
        this.zMinusIcon.render(ctx);
        this.removeIcon.render(ctx);
        this.rotateIcon.render(ctx);
    
        this.imageScaleLockIcon.render(ctx);
        this.scaleIcon.render(ctx);
      }
      catch (e) {
        console.log(e, this.optionEditActive, this.selected, this.selected?.optionContext);
        throw e;
      }
    }

    if (this.creatingBubble) {
      this.drawSelectedUI(ctx, this.creatingBubble);
    }
  }

  renderOthers(ctx: CanvasRenderingContext2D): void {
    this.createBubbleIcon.render(ctx);
    if (this.lit) {
      this.drawLitUI(ctx, this.lit);
    }
  }

  calculateSheetRect(rect: Rect): Rect {
    return calculateSheetRect(rect, [160, 160], SHEET_Y_MARGIN, 1 / this.paper.matrix.a);
  }

  drawSheet(ctx: CanvasRenderingContext2D, rect: Rect) {
    const corners: Trapezoid = rectToTrapezoid(rect);
    drawSheet(ctx, corners, this.calculateSheetRect(rect), "rgba(64, 128, 64, 0.7)");
  }

  drawLitUI(ctx: CanvasRenderingContext2D, bubble: Bubble): void {
    const [x, y, w, h] = bubble.getPhysicalRegularizedRect(this.getPaperSize());

    // 選択枠描画
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 0, 255, 0.7)";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  drawSelectedUI(ctx: CanvasRenderingContext2D, bubble: Bubble): void {
    const paperSize = this.getPaperSize();
    const [x, y, w, h] = bubble.getPhysicalRegularizedRect(paperSize);

    // 選択枠描画
    const corners: Trapezoid = {
      topLeft: [x, y],
      topRight: [x + w, y],
      bottomLeft: [x, y + h],
      bottomRight: [x + w, y + h],
    }
    drawSelectionFrame(ctx, "rgba(0, 192, 0, 1)", corners, 3, 5);

    // フィルムの枠
    ctx.save();
    ctx.translate(x + w * 0.5, y + h * 0.5);
    ctx.rotate((-bubble.rotation * Math.PI) / 180);
    drawFilmStackBorders(ctx, bubble.filmStack, paperSize);
    ctx.restore();

    // 操作対象のハンドルを強調表示
    if (this.handle != null) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
      const handleRect = bubble.getHandleRect(paperSize, this.handle);
      if (handleRect) {
        ctx.fillRect(...handleRect);
      }
      ctx.restore();
    }
  }

  drawOptionHandles(ctx: CanvasRenderingContext2D, bubble: Bubble): void {
    const paperSize = this.getPaperSize();
    const bubbleCenter = bubble.getPhysicalCenter(paperSize);
    const [x,y,w,h] = bubble.getPhysicalRegularizedRect(paperSize);
    const rect: Rect = [x+10, y+10, w-20, h-20];
    const cp = (ro: Vector, ou: Vector) => ClickableIcon.calcPosition(rect, iconUnit, ro, ou);
    const rp = (p: Vector): Vector => [bubbleCenter[0] + p[0], bubbleCenter[1] + p[1]];
    const tailMidCoord = () => tailCoordToWorldCoord(bubbleCenter, bubble.optionContext.tailTip, bubble.optionContext.tailMid);

    // Define option priority order
    const optionPriority: { [key: string]: number } = {
      "tailTip": 2,
      "tailMid": 1,
      "link": 3,
      "focalPoint": 4,
      "focalRange": 5
    };
    
    // Get all available options and sort by priority
    const optionSet = bubble.optionSet;
    const options = Object.keys(optionSet)
      .filter(option => optionPriority[option] !== undefined)
      .sort((a, b) => optionPriority[a] - optionPriority[b]);
    
    // Render icons in priority order
    for (const option of options) {
      let icon;
      switch (option) {
      case "tailTip":
        icon = this.optionIcons[optionSet.tailTip.icon];
        icon.position = rp(bubble.optionContext.tailTip);
        icon.render(ctx);
        break;
      case "tailMid":
        icon = this.optionIcons[optionSet.tailMid.icon];
        icon.position = tailMidCoord();
        icon.render(ctx);
        break;
      case "link":
        icon = this.optionIcons[optionSet.link.icon];
        icon.position = cp([0.5, 1], [0, 0]);
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
        icon.position = [px + rx, py + ry];
        icon.render(ctx);
        })();
        break;
      }
    }
  }

  drawOptionUI(ctx: CanvasRenderingContext2D, bubble: Bubble): void {
    const paperSize = this.getPaperSize();
    const bubbleCenter = bubble.getPhysicalCenter(paperSize);

    if (this.optionEditActive.tail) {
      const [cx, cy] = bubbleCenter;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + bubble.optionContext.tailTip[0], cy + bubble.optionContext.tailTip[1]);
      ctx.stroke();
    } 
    if (this.optionEditActive.focal) {
      const [cx, cy] = bubbleCenter;
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

      const c = b.getPhysicalCenter(paperSize);
      if (this.getGroupMaster(b) === this.getGroupMaster(bubble)) {
        ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(...c);
        ctx.lineTo(...bubbleCenter);
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
        const rect = b.getPhysicalRegularizedRect(paperSize);
        ctx.strokeRect(...rect);
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

  pointerHover(p: Vector, depth: number): Layer | null {
    if (keyDownFlags["Space"]) { return null; }
    if (depth === 2){
      return this.pointerHoverSelected(p);
    } else {
      return this.pointerHoverOthers(p);
    }
  }

  pointerHoverSelected(p: Vector): Layer | null {
    const paperSize = this.getPaperSize();
    if (this.selected) {
      this.handle = this.selected.getHandleAt(paperSize, p);

      if (this.removeIcon.hintIfContains(p, this.hint) ||
        this.rotateIcon.hintIfContains(p, this.hint) ||
        this.dragIcon.hintIfContains(p, this.hint) ||
        this.offsetIcon.hintIfContains(p, this.hint) ||
        this.zMinusIcon.hintIfContains(p, this.hint) ||
        this.zPlusIcon.hintIfContains(p, this.hint) ||
        this.imageScaleLockIcon.hintIfContains(p, this.hint) ||
        this.scaleIcon.hintIfContains(p, this.hint) ||
        this.hintOptionIcon(this.selected.shape, p)) {
        this.handle = null;
      } else if (this.selected.contains(paperSize, p)) {
        this.hint(null, null);
      }

      if (this.handle || this.selected.contains(paperSize, p)) {
        this.redraw();
        return this;
      }
    }
    return null;
  }

  pointerHoverOthers(p: Vector): Layer | null {
    if (this.createBubbleIcon.hintIfContains(p, this.hint)) {
      return this;      
    }

    const paperSize = this.getPaperSize();
    for (let bubble of this.bubbles) {
      if (bubble.contains(paperSize, p)) {
        const r = bubble.getPhysicalRegularizedRect(paperSize);
        this.hint(r, "Alt+ドラッグで移動、クリックで選択");
        this.lit = bubble;
        this.redraw();
        return this;
      }
    }
    return null;
  }

  pointerUnhover(layer: Layer) {
    if (layer === this) {return;}
    this.lit = null;
    this.handle = null;
    this.redraw();
  }

  async keyDown(position: Vector, event: KeyboardEvent): Promise<boolean> {
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
      return await this.pasteBubble(position);
    }
    // カーソルキー
    if (this.selected) {
      if (event.code === 'ArrowLeft') {
        if (this.selected.optionSet.randomSeed) {
          this.selected.optionContext.randomSeed -= 1;
          if (this.selected.optionContext.randomSeed < 0) {
            this.selected.optionContext.randomSeed = 100;
          }
          this.onCommit(true);
          this.redraw();
          return true;
        }
      }
      if (event.code === 'ArrowRight') {
        if (this.selected.optionSet.randomSeed) {
          this.selected.optionContext.randomSeed += 1;
          if (100 < this.selected.optionContext.randomSeed) {
            this.selected.optionContext.randomSeed = 0;
          }
          this.onCommit(true);
          this.redraw();
          return true;
        }
      }
      if (event.code === 'Delete') {
        this.removeBubble(this.selected);
        return true;
      }
    }
    return false;
  }

  copyBubble(): void {
    if (this.selected) {
      const t = Bubble.decompile(this.selected);
      navigator.clipboard.writeText(JSON.stringify(t, null, 2)).then(() => {
        console.log("copied");
      });
    }
  }

  async pasteBubble(position: Vector): Promise<boolean> {
    console.log("pasteBubble");
    try {
      const items = await navigator.clipboard.read();

      for (let item of items) {
        for (let type of item.types) {
          if (type === "text/plain") {
            const blob = await item.getType(type);
            const text = await blob.text();
            this.createTextBubble(text);
            return true;
          } else if (type.startsWith("image/")) {
            const paperSize = this.getPaperSize();
            for (let bubble of this.bubbles) {
              if (bubble.contains(paperSize, position)) {
                const canvas = await createCanvasFromBlob(await item.getType(type));
                this.receiveMedia(bubble, canvas);
                return true;
              }
            }
            return false;
            
            return true;
          }
        }
      }
    }
    catch(err) {
      console.error('ユーザが拒否、もしくはなんらかの理由で失敗', err);
    }
    return false;
  }

  createTextBubble(text: string): Bubble[] {
    const paperSize = this.getPaperSize();
    try {
      const b = Bubble.compile(paperSize, JSON.parse(text));
      const bubbleSize = b.getPhysicalSize(paperSize);
      b.parent = null;
      b.uuid = ulid();
      const x = Math.random() * (paperSize[0] - bubbleSize[0]);
      const y = Math.random() * (paperSize[1] - bubbleSize[1]);
      b.setPhysicalRect(paperSize, [x, y, ...bubbleSize]);
      this.bubbles.push(b);
      this.selectBubble(b);
      return [b];
    }
    catch (e) {
      let cursorX = 10;
      let cursorY = 10;
      let lineHeight = 0;
      let lastBubble = null;
      const bubbles = [];
      for (let s of text.split(/\n\s*\n/)) {
        const b = this.defaultBubbleSlot.bubble.clone(false);
        b.parent = null;
        b.text = s;
        b.filmStack.films = [];
        const size = b.calculateFitSize(paperSize);

        if (cursorX + size[0] > paperSize[0]) {
          cursorX = 10;
          cursorY += lineHeight + 10;
          lineHeight = 0;
        }
        const x = cursorX;
        const y = cursorY;

        b.setPhysicalRect(paperSize, [x, y, ...size]);
        b.text = s;
        b.initOptions();
        bubbles.push(b);        
        this.bubbles.push(b);
        cursorX += size[0] + 10;
        lineHeight = Math.max(lineHeight, size[1]);
        lastBubble = b;
      }
      this.selectBubble(lastBubble);
      return bubbles;
    }
  }

  createMediaBubble(media: HTMLCanvasElement | HTMLVideoElement): void {
    const film = this.newMediaFilm(media);

    const bubble = new Bubble();
    const paperSize = this.getPaperSize();
    const imageSize = film.media.size;
    const x = Math.random() * (paperSize[0] - imageSize[0]);
    const y = Math.random() * (paperSize[1] - imageSize[1]);
    bubble.setPhysicalRect(paperSize, [x, y, ...imageSize] as Rect);
    bubble.forceEnoughSize(paperSize);
    bubble.shape = "none";
    bubble.initOptions();
    bubble.text = "";

    const minImageDimension = Math.min(...imageSize) ;
    const minPageDimension = Math.min(paperSize[0], paperSize[1]);
    const n_scale = 1 / (minPageDimension / minImageDimension);

    film.n_scale = n_scale;
    bubble.filmStack.films.push(film);
    this.bubbles.push(bubble);
    this.onCommit();
    this.selectBubble(bubble);
  }

  removeBubble(bubble: Bubble): void {
    const index = this.bubbles.indexOf(bubble);
    this.bubbles.splice(index, 1);
    for (let b of this.bubbles) {
      if (b.parent === bubble.uuid) {
        b.parent = null;
      }
    }
    this.unfocus();
    this.onCommit();
  }
  
  hintOptionIcon(shape: string, p: Vector): boolean {
    const optionSet = bubbleOptionSets[shape];
    for (const option of Object.keys(optionSet)) {
      const icon = this.optionIcons[optionSet[option].icon];
      if (!icon) { continue; }
      if (icon.hintIfContains(p, this.hint)) {
        return true;
      }
    }
    return false;
  }

  isOnOptionIcon(shape: string, p: Vector): boolean {
    const optionSet = bubbleOptionSets[shape];
    for (const option of Object.keys(optionSet)) {
      const icon = this.optionIcons[optionSet[option].icon];
      if (icon.contains(p)) {
        return true;
      }
    }
    return false;
  }

  pick(point: Vector): Picked[] {
    const paperSize = this.getPaperSize();
    const picked: Picked[] = [];
    for (let bubble of this.bubbles.toReversed()) {
      if (bubble.contains(paperSize, point)) {
        picked.push({
          selected: bubble === this.selected, 
          action: () => { this.selectBubble(bubble)}
        });
      }
    }
    return picked;
  }

  accepts(point: Vector, _button: number, depth: number): any {
    if (!this.interactable) {
      return null;
    }

    if (keyDownFlags["Space"]) {
      return null;
    }

    if (keyDownFlags["KeyF"]) {
      return { action: "create" };
    }
    if (keyDownFlags["KeyG"]) {
      return { action: "create-surface" };
    }
    if (this.createBubbleIcon.contains(point)) {
      return { action: "create" };
    }

    if (depth == 2) {
      return this.acceptsForeground(point, _button);
    } else {
      return this.acceptsBackground(point, _button);
    }
  }

  acceptsForeground(point: Vector, _button: number): any {
    const paperSize = this.getPaperSize();

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
      } else if (this.imageScaleLockIcon.contains(point)) {
        return { action: "image-scale-lock", bubble };
      } else if (this.scaleIcon.contains(point)) {
        return { action: "image-scale", bubble };
      } else {
        const icon = this.getOptionIconAt(bubble.shape, point);
        if (icon) {
          return { action: "options-" + icon, bubble };
        }
      }

      const handle = bubble.getHandleAt(paperSize, point);
      if (handle) {
        return { action: "resize", bubble, handle };
      }

      const gm = this.getGroupMaster(bubble);
      if (0 < gm.filmStack.films.length && !gm.scaleLock && bubble.contains(paperSize, point)) {
        if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) {
          return { action: "image-scale", bubble: gm };
        } else if (!keyDownFlags["AltLeft"] && !keyDownFlags["AltRight"]) {
          return { action: "image-move", bubble: gm };
        }
      }

      // 貫通
      if (bubble.contains(paperSize, point)) {
        this.pierce();
        return { action: "pierce" };
      }
    }
    return null;
  } 
  
  acceptsBackground(point: Vector, _button: number): any {
    const paperSize = this.getPaperSize();

    if (keyDownFlags["KeyQ"] || keyDownFlags["AltLeft"] || keyDownFlags["AltRight"] || keyDownFlags["KeyS"]) {
      for (let bubble of this.bubbles.toReversed()) {
        if (!bubble.contains(paperSize, point)) { continue; }
        if (keyDownFlags["KeyQ"]) {
          return { action: "remove", bubble };
        } else if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
          return { action: "move", bubble };
        } else if (keyDownFlags["KeyS"]) {
          return { action: "copy-style", bubble };
        }
      }
    }

    for (let bubble of this.bubbles.toReversed()) {
      if (!bubble.contains(paperSize, point)) { continue; }
      return { action: "select", bubble };
    }

    return null;
  }

  changeFocus(layer: Layer | null) {
    if (layer != this) {
      // unfocus呼ぶと再帰呼び出しになるので注意
      if (this.selected) {
        this.stopVideo(this.selected);
        this.selected = null;
        this.onFocus(null);
      }
    }
  }

  getOptionIconAt(shape: string, p: Vector) {
    const optionSet = bubbleOptionSets[shape];
    for (const option of Object.keys(optionSet)) {
      const icon = this.optionIcons[optionSet[option].icon];
      if (!icon) { continue; }
      if (icon.contains(p)) {
        return option;
      }
    }
    return null;
  }

  unfocus(): void {
    if (this.selected) {
      this.onFocus(null);
      this.focusKeeper.setFocus(null);
      this.selected = null;
      this.redraw();
    }
  }

  async *pointer(dragStart: Vector, payload: any): AsyncGenerator<void, void, Vector> {
    this.hint(null, null);

    if (payload.action === "create") {
      yield* this.createBubble(dragStart, false);
    } else if (payload.action === "create-surface") {
      yield* this.createBubble(dragStart, true);
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
      this.removeBubble(payload.bubble);
      this.redraw();
    } else if (payload.action === "copy-style") {
      yield* this.copyStyle(dragStart, payload.bubble);
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

  async receiveMedia(bubble: Bubble, media: HTMLCanvasElement | HTMLVideoElement): Promise<void> {
    const paperSize = this.getPaperSize();
    const film = this.newMediaFilm(media);
    bubble.filmStack.films.push(film);
    const bubbleSize = bubble.getPhysicalSize(paperSize);
    const scale = minimumBoundingScale(film.media.size, bubbleSize);
    film.setShiftedScale(paperSize, scale);
    if (media instanceof HTMLCanvasElement) {
      bubble.gallery.push(film.media);
    }
    this.onFocus(bubble);
    this.focusKeeper.setFocus(this);
    this.onCommit();
  };

  dropped(position: Vector, media: HTMLCanvasElement | HTMLVideoElement | string): boolean {
    if (!this.interactable) { return false; }

    if (typeof media === "string") {
      this.createTextBubble(media);
      this.onCommit();
      return true;
    }

    if (this.createBubbleIcon.contains(position)) {
      this.createMediaBubble(media);
      this.onCommit();
      return true;
    }

    const paperSize = this.getPaperSize();

    if (this.selected && this.selected.contains(paperSize, position)) {
      this.receiveMedia(this.selected, media);
      return true;
    }

    for (let bubble of this.bubbles.toReversed()) {
      if (bubble.contains(paperSize, position)) {
        this.receiveMedia(bubble, media);
        return true;
      }
    }

    return false;
  }

  pasted(position: Vector, media: HTMLCanvasElement | HTMLVideoElement | string): boolean {
    return this.dropped(position, media);
  }

  doubleClicked(p: Vector): boolean {
    if (!this.interactable) { return false; }

    const paperSize = this.getPaperSize();

    for (let bubble of this.bubbles) {
      if (bubble.contains(paperSize, p)) {
        const size = bubble.calculateFitSize(paperSize);
        bubble.setPhysicalSize(paperSize, size);
        this.onCommit();
        this.relayoutIcons();
        return true;
      }
    }

    const q = Bubble.normalizedPosition(paperSize, p);

    const bubble = this.defaultBubbleSlot.bubble.clone(false);
    bubble.parent = null;
    bubble.filmStack.films = [];
    bubble.n_p0 = [q[0] - 0.12, q[1] - 0.12];
    bubble.n_p1 = [q[0] + 0.12, q[1] + 0.12];
    //bubble.n_p0 = [0,0];
    //bubble.n_p1 = [1,1];
    bubble.initOptions();
    bubble.text = getHaiku();
    this.bubbles.push(bubble);
    this.onCommit();
    this.selectBubble(bubble);
    return true;
  }

  relayoutIcons(): void {
    const paperSize = this.getPaperSize();
    const rscale = 1 / this.paper.matrix.a;
    const unit: Vector = scale2D([...iconUnit], rscale);
    const bubbleRect = this.selected!.getPhysicalRegularizedRect(paperSize);
    const grid = new Grid(this.calculateSheetRect(bubbleRect), -10, unit);
    const cp = grid.calcPosition.bind(grid);

    this.dragIcon.position = cp([0.5, 0], [0, 0]);
    this.offsetIcon.position = add2D(cp([0.5, 0.25], [0, 0]), this.selected!.getPhysicalOffset(paperSize));
    this.zPlusIcon.position = cp([0,0], [1,0]);
    this.zMinusIcon.position = cp([0,0], [0,0]);
    this.removeIcon.position = cp([1,0], [0, 0]);
    this.rotateIcon.position = cp([0.5,1], [0, 0]);

    this.imageScaleLockIcon.position = cp([1,1],[0,0]);
    this.imageScaleLockIcon.index = this.selected!.scaleLock ? 1 : 0;

    this.scaleIcon.position = cp([1,1],[-2,0]);
  }

  *createBubble(dragStart: Vector, createsSurface: boolean): Generator<void, void, Vector> {
    const paperSize = this.getPaperSize();
    this.unfocus();
    const bubble = this.defaultBubbleSlot.bubble.clone(false);
    bubble.parent = null;
    bubble.filmStack.films = [];
    bubble.setPhysicalRect(paperSize, [dragStart[0], dragStart[1], 0, 0]);
    bubble.text = getHaiku();
    bubble.initOptions();
    if (createsSurface) {
      bubble.shape = "none";
      bubble.text = "";
    }
    this.creatingBubble = bubble;

    let p: Vector;
    try {
      while ((p = yield)) {
        bubble.n_p1 = Bubble.normalizedPosition(paperSize, p);
        this.redraw();
      }

      this.creatingBubble = null;
      bubble.regularize();
      if (bubble.hasEnoughSize(paperSize)) {
        this.bubbles.push(bubble);
        this.onCommit();
        if (createsSurface) {
          const size = bubble.getPhysicalSize(paperSize);
          const film = this.newMinmumBoundingFilm(size);
          bubble.filmStack.films.push(film);
        }
      }
      this.selectBubble(bubble);
    } catch (e) {
      if (e === "cancel") {
        this.creatingBubble = null;
      }
    }
  }

  *moveBubble(dragStart: Vector, bubble: Bubble): Generator<void, void, Vector> {
    const paperSize = this.getPaperSize();
    const [x, y, w, h] = bubble.getPhysicalRegularizedRect(paperSize);
    const [dx, dy] = [dragStart[0] - x, dragStart[1] - y];

    let p: Vector;
    try {
      while ((p = yield)) {
        bubble.setPhysicalRect(paperSize, [p[0] - dx, p[1] - dy, w, h]);
        if (bubble === this.selected) {
          this.relayoutIcons();
        }
        this.redraw();
      }
      this.onPotentialCrossPage(bubble);
      this.onCommit();
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  *copyStyle(_dragStart: Vector, bubble: Bubble): Generator<void, void, Vector> {
    const paperSize = this.getPaperSize();
    let p, last;
    try {
      while (p = yield) {
        last = p;
        this.lit = null;
        for (let i = this.bubbles.length - 1; 0 <= i; i--) {
          const b = this.bubbles[i];
          if (b.contains(paperSize, last)) {
            this.lit = b;
            break;
          }
        }  
        this.redraw();
      }
      this.lit = null;
      for (let i = this.bubbles.length - 1; 0 <= i; i--) {
        const b = this.bubbles[i];
        if (b.contains(paperSize, last!)) {
          b.copyStyleFrom(bubble);
          this.onCommit();
          break;
        }
      }  
    } catch (e) {
      if (e === "cancel") {
      }
    }
  }

  *rotateBubble(dragStart: Vector, bubble: Bubble): Generator<void, void, Vector> {
    const originalRotation = bubble.rotation;
    const s = dragStart;

    let p: Vector;
    try {
      while ((p = yield)) {
        const op = (p[0] - s[0]);
        bubble.rotation = Math.max(-180, Math.min(180, originalRotation + op * 0.2));
        this.redraw();
      }
      this.onCommit();
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  *offsetBubbleText(dragStart: Vector, bubble: Bubble): Generator<void, void, Vector> {
    const paperSize = this.getPaperSize();
    const q = bubble.getPhysicalOffset(paperSize);
    let p;
    try {
      while ((p = yield)) {
        bubble.setPhysicalOffset(paperSize, [q[0] + p[0] - dragStart[0], q[1] + p[1] - dragStart[1]]);
        if (bubble === this.selected) {
          this.relayoutIcons();
        }
        this.redraw();
      }
      this.onCommit();
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      }
    }
  }

  *resizeBubble(dragStart: Vector, bubble: Bubble, handle: RectHandle): Generator<void, void, Vector> {
    try {
      const paperSize = this.getPaperSize();
      const [q0, q1] = bubble.regularized();
      let ir = calculateMinimumBoundingRect(paperSize, bubble.filmStack.films);
      // computeConstraintedRectは十分に大きいときには反応しないので、小さくしておく
      if (ir) {
        ir = scaleRect(ir, 0.01);
      }

      const transformer = new FilmStackTransformer(paperSize, bubble.filmStack.films);

      let p;
      while ((p = yield)) {
        const pp = Bubble.normalizedPosition(paperSize, p);
        this.resizeBubbleAux(bubble, handle, q0, q1, pp);

        if (ir && bubble.scaleLock) {
          // イメージの位置を中央に固定し、フキダシの大きさにイメージを合わせる
          const bubbleRect = bubble.getPhysicalRect(paperSize);
          const { scale } = computeConstraintedRect(ir, bubbleRect);
          transformer.scale(scale * 0.01);          
        }
  
        this.relayoutIcons();
        this.redraw();
      }
      bubble.regularize();
      if (!bubble.hasEnoughSize(paperSize)) {
        throw "cancel";
      }
      this.onPotentialCrossPage(bubble);
      this.onCommit();
    } catch (e) {
      if (e === "cancel") {
        this.selected = null;
        this.onRevert();
      } else {
        console.error(e);
      }
    }
  }

  resizeBubbleAux(bubble: Bubble, handle: RectHandle, q0: Vector, q1: Vector, p: Vector) {
    const paperSize = this.getPaperSize();

    if (bubble.scaleLock) {
      const rwfar = (os: Vector, ns: Vector) => {
        return this.resizeWithFixedAspectRatio(os, ns);
      }
  
      const qq0 = Bubble.denormalizedPosition(paperSize, q0);
      const qq1 = Bubble.denormalizedPosition(paperSize, q1);
      const pp = Bubble.denormalizedPosition(paperSize, p);
      const [cx, cy] = [(qq0[0] + qq1[0]) / 2, (qq0[1] + qq1[1]) / 2];
      const originalSize: Vector = [qq1[0] - qq0[0], qq1[1] - qq0[1]];

      let userSize: Vector;
      let w: number, h: number, scale: number;
      switch (handle) {
        case "topLeft":
          userSize = [qq1[0] - pp[0], qq1[1] - pp[1]];
          [w,h] = rwfar(originalSize, userSize);
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [qq1[0] - w, qq1[1] - h]);
          break;
        case "topRight":
          userSize = [pp[0] - qq0[0], qq1[1] - pp[1]];
          [w,h] = rwfar(originalSize, userSize);
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [qq0[0], qq1[1] - h]);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [qq0[0] + w, qq1[1]]);
          break;
        case "bottomLeft":
          userSize = [qq1[0] - pp[0], pp[1] - qq0[1]];
          [w,h] = rwfar(originalSize, userSize);
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [qq1[0] - w, qq0[1]]);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [qq1[0], qq0[1] + h]);
          break;
        case "bottomRight":
          userSize = [pp[0] - qq0[0], pp[1] - qq0[1]];
          [w,h] = rwfar(originalSize, userSize);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [qq0[0] + w, qq0[1] + h]);
          break;
        case "top":
          userSize = [originalSize[0], qq1[1] - pp[1]];
          scale = userSize[1] / originalSize[1];
          [w, h] = [originalSize[0] * scale, userSize[1]];
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [cx - w / 2, qq1[1] - h]);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [cx + w / 2, qq1[1]]);
          break;
        case "bottom":
          userSize = [originalSize[0], pp[1] - qq0[1]];
          scale = userSize[1] / originalSize[1];
          [w, h] = [originalSize[0] * scale, userSize[1]];
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [cx - w / 2, qq0[1]]);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [cx + w / 2, qq0[1] + h]);
          break;
        case "left":
          userSize = [qq1[0] - pp[0], originalSize[1]];
          scale = userSize[0] / originalSize[0];
          [w, h] = [userSize[0], originalSize[1] * scale];
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [qq1[0] - w, cy - h / 2]);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [qq1[0], cy + h / 2]);
          break;
        case "right":
          userSize = [pp[0] - qq0[0], originalSize[1]];
          scale = userSize[0] / originalSize[0];
          [w, h] = [userSize[0], originalSize[1] * scale];
          bubble.n_p0 = Bubble.normalizedPosition(paperSize, [qq0[0], cy - h / 2]);
          bubble.n_p1 = Bubble.normalizedPosition(paperSize, [qq0[0] + w, cy + h / 2]);
          break;
      }    
    } else {
      switch (handle) {
        case "topLeft":
          bubble.n_p0 = p;
          break;
        case "topRight":
          bubble.n_p0 = [q0[0], p[1]];
          bubble.n_p1 = [p[0], q1[1]];
          break;
        case "bottomLeft":
          bubble.n_p0 = [p[0], q0[1]];
          bubble.n_p1 = [q1[0], p[1]];
          break;
        case "bottomRight":
          bubble.n_p1 = p;
          break;
        case "top":
          bubble.n_p0 = [q0[0], p[1]];
          break;
        case "bottom":
          bubble.n_p1 = [q1[0], p[1]];
          break;
        case "left":
          bubble.n_p0 = [p[0], q0[1]];
          break;
        case "right":
          bubble.n_p1 = [p[0], q1[1]];
          break;
      }
    }
  }    

  *translateImage(dragStart: Vector, bubble: Bubble) {
    // クリック判定と兼用
    const startingTime = performance.now();

    const paperSize = this.getPaperSize();
    const films = bubble.filmStack.getOperationTargetFilms();
    const origins = films.map(film => film.getShiftedTranslation(paperSize));

    try {
      let lastq = null;
      yield* translate(dragStart, (q: Vector) => {
        lastq = [...q];
        films.forEach((film, i) => {
          film.setShiftedTranslation(paperSize, [origins[i][0] + q[0], origins[i][1] + q[1]]);
        });
        this.redraw();
      });
      if (lastq![0] !== 0 || lastq![1] !== 0) {
        this.onCommit();
      }
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }

    if (performance.now() - startingTime < 200) {
      // クリック判定
      this.pierce();
    }
  }


  *scaleImage(dragStart: Vector, bubble: Bubble) {
    const paperSize = this.getPaperSize();
    const films = bubble.filmStack.getOperationTargetFilms();

    try {
      const transformer = new FilmStackTransformer(paperSize, films);

      yield* scale(this.getPaperSize(), dragStart, (q: Vector) => {
        transformer.scale(Math.max(q[0], q[1]))
        this.redraw();
      });
      this.onCommit();
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
  }

  *optionsTailTip(p: Vector, bubble: Bubble) {
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

  *optionsTailMid(p: Vector, bubble: Bubble) {
    const paperSize = this.getPaperSize();
    console.log("optionsTailMid");
    // bubble.centerを原点(O)とし、
    // X軸: O->tailTip Y軸: O->pependicular(O->tailTip)座標系の座標
    // この座標系をtail座標系と呼ぶ
    const s = bubble.optionContext.tailMid;
    try {
      while (p = yield) {
        this.optionEditActive.tail = true;
        const c = bubble.getPhysicalCenter(paperSize);
        bubble.optionContext.tailMid = worldCoordToTailCoord(c, bubble.optionContext.tailTip, p);
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

  *optionsLink(p: Vector, bubble: Bubble) {
    const paperSize = this.getPaperSize();
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
          if (b !== bubble && b.contains(paperSize, drop) && b.canLink()) {
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
            this.onCommit();
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

  *optionsFocalPoint(p: Vector, bubble: Bubble) {
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

  *optionsFocalRange(p: Vector, bubble: Bubble) {
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

  getGroup(bubble: Bubble) {
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

  regularizeGroup(g: Bubble[]) {
    // parent1つに集約する
    const parent = g[0];
    for (let i = 1; i < g.length; i++) {
      const child = g[i];
      child.linkTo(parent);
    }
  }

  mergeGroup(g1: Bubble[], g2: Bubble[]) {
    const g = g1.concat(g2);
    this.regularizeGroup(g);
  }

  getGroupMaster(bubble: Bubble) {
    if (bubble.parent) {
      const parent =  this.bubbles.find((b) => b.uuid === bubble.parent);
      if (parent) {return parent;}
    }
    return bubble;
  }

  resizeWithFixedAspectRatio(originalSize: Vector, newSize: Vector) {
    const [originalWidth, originalHeight] = originalSize;
    const [newWidth, newHeight] = newSize;
  
    const scaleFactorX = newWidth / originalWidth;
    const scaleFactorY = newHeight / originalHeight;
  
    const dominantScaleFactor = Math.max(scaleFactorX, scaleFactorY);
  
    const scaledWidth = Math.round(originalWidth * dominantScaleFactor);
    const scaledHeight = Math.round(originalHeight * dominantScaleFactor);
  
    return [scaledWidth, scaledHeight];
  }

  toggleScaleLock(bubble: Bubble) {
    bubble.scaleLock = !bubble.scaleLock;
    this.imageScaleLockIcon.index = bubble.scaleLock ? 1 : 0;
    if (bubble.scaleLock) {
      const paperSize = this.getPaperSize();

      {
        const transformer = new FilmStackTransformer(paperSize, bubble.filmStack.films);
        // [0]のscaleを1とする
        const scale = bubble.filmStack.films[0].getShiftedScale(paperSize);
        transformer.scale(1 / scale);
      }
      const ir = calculateMinimumBoundingRect(paperSize, bubble.filmStack.films)!;
      const origins = bubble.filmStack.films.map(film => film.getShiftedTranslation(paperSize));
      const move = getRectCenter(ir);

      const bubbleSize = bubble.getPhysicalSize(paperSize);
      const [w,h] = this.resizeWithFixedAspectRatio([ir[2], ir[3]], bubbleSize);
      const newScale = w / ir[2];
      console.log("newScale", newScale);
      const [cx,cy] = bubble.getPhysicalCenter(paperSize);
      bubble.n_p0 = Bubble.normalizedPosition(paperSize, [cx - w/2, cy - h/2]);
      bubble.n_p1 = Bubble.normalizedPosition(paperSize, [cx + w/2, cy + h/2]);
      bubble.filmStack.films.forEach((film, i) => {
        film.setShiftedTranslation(paperSize, [origins[i][0] + move[0], origins[i][1] + move[1]]);
      });
      {
        const transformer = new FilmStackTransformer(paperSize, bubble.filmStack.films);
        transformer.scale(newScale);
      }
      this.relayoutIcons();
    }
    this.redraw();
  }

  selectBubble(bubble: Bubble | null) {
    this.stopVideo(this.selected);
    this.unfocus();
    for (let a of Object.keys(this.optionEditActive)) {
      if (this.optionEditActive[a]) {
        this.redraw();
        return;
      }
    }

    this.startVideo(bubble);

    this.selected = bubble;
    this.relayoutIcons();
    this.onFocus(this.selected);
    this.focusKeeper.setFocus(this);

    this.redraw();
  }

  videoRedrawFrameId: number | undefined;
  stopVideo(bubble: Bubble | null) {
    if (this.videoRedrawFrameId !== undefined) {
      cancelAnimationFrame(this.videoRedrawFrameId);
      this.videoRedrawFrameId = undefined;
    }
    if (bubble) {
      for (const film of bubble.filmStack.films) {
        film.media.player?.pause();
      }
    }
  }

  startVideo(bubble: Bubble | null) {
    if (!bubble) { return; }

    let playFlag = false;
    for (const film of bubble.filmStack.films) {
      if (film.media.player) {
        playFlag = true;
        film.media.player.play();
      }
    }
    if (playFlag) {
      const redraw = () => {
        this.redraw();
        this.videoRedrawFrameId = requestAnimationFrame(redraw);
      };
      this.videoRedrawFrameId = requestAnimationFrame(redraw);
    }
  }

  tearDown() {
    // 動画再生のrequestAnimationFrameをキャンセル
    if (this.videoRedrawFrameId !== undefined) {
      cancelAnimationFrame(this.videoRedrawFrameId);
      this.videoRedrawFrameId = undefined;
    }

    // 選択中のバブルの動画を停止
    if (this.selected) {
      this.stopVideo(this.selected);
    }

    // 基底クラスのtearDownを呼び出す
    super.tearDown();
  }

  get interactable(): boolean { return this.mode == null; }

  setFold(n: number) {
    this.fold = n;
    if (this.fold === 1) {
      this.createBubbleIcon.pivot = [1,0];
    } else {
      this.createBubbleIcon.pivot = [0,1];
    }
  }

  newMediaFilm(media: HTMLCanvasElement | HTMLVideoElement): Film {
    if (media instanceof HTMLCanvasElement) {
      return new Film(new ImageMedia(media));
    } else {
      return new Film(new VideoMedia(media));
    }
  }

  newMinmumBoundingFilm([w,h]: Vector): Film {
    // 256ごとに切り上げ
    const unit = 16;
    const [w2,h2] = [Math.ceil(w / unit) * unit, Math.ceil(h / unit) * unit];
    console.log(w, h, w2, h2);
    const canvas = makePlainCanvas(w2, h2, "#ffffff00");
    const film = this.newMediaFilm(canvas);
    film.setShiftedScale(this.getPaperSize(), 1);
    console.log("n_scale", film.n_scale);
    return film;
  } 
}
sequentializePointer(BubbleLayer);

