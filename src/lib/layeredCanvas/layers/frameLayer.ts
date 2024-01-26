import { Layer, sequentializePointer } from "../system/layeredCanvas";
import { FrameElement, type Layout,type Border, type PaddingHandle, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findPaddingAt, makeBorderTrapezoid, makePaddingTrapezoid, rectFromBox } from "../dataModels/frameTree";
import { constraintRecursive, constraintLeaf } from "../dataModels/frameTree";
import { translate, scale, rotate } from "../tools/pictureControl";
import { keyDownFlags } from "../system/keyCache";
import { BaseIcon, ClickableIcon, MultistateIcon } from "../tools/draw/clickableIcon";
import { trapezoidPath } from "../tools/geometry/trapezoid";
import type { Vector } from '../tools/geometry/geometry';
import type { PaperRendererLayer } from "./paperRendererLayer";

const iconUnit: Vector = [32,32];

export class FrameLayer extends Layer {
  renderLayer: PaperRendererLayer;
  frameTree: FrameElement;
  onCommit: () => void;
  onRevert: () => void;
  onGenerate: (element: FrameElement) => void;
  onScribble: (element: FrameElement) => void;
  onInsert: (element: FrameElement) => void;
  onSplice: (element: FrameElement) => void;
  cursorPosition: Vector;

  splitHorizontalIcon: ClickableIcon;
  splitVerticalIcon: ClickableIcon;
  deleteIcon: ClickableIcon;
  duplicateIcon: ClickableIcon;
  insertIcon: ClickableIcon;
  spliceIcon: ClickableIcon;
  zplusIcon: ClickableIcon;
  zminusIcon: ClickableIcon;
  visibilityIcon: MultistateIcon;
  scaleIcon: ClickableIcon;
  rotateIcon: ClickableIcon;
  dropIcon: ClickableIcon;
  flipHorizontalIcon: ClickableIcon;
  flipVerticalIcon: ClickableIcon;
  fitIcon: ClickableIcon;
  generateIcon: ClickableIcon;
  scribbleIcon: ClickableIcon;
  expandHorizontalIcon: ClickableIcon;
  slantHorizontalIcon: ClickableIcon;
  expandVerticalIcon: ClickableIcon;
  slantVerticalIcon: ClickableIcon;
  showsScribbleIcon: MultistateIcon;

  frameIcons: BaseIcon[];
  borderIcons: BaseIcon[];

  focusedLayout: Layout;
  focusedBorder: Border;
  focusedPadding: PaddingHandle;
  pointerHandler: any;

  constructor(
    renderLayer: PaperRendererLayer,
    frameTree: FrameElement, 
    onCommit: () => void, 
    onRevert: () => void, 
    onGenerate: (element: FrameElement) => void, 
    onScribble: (element: FrameElement) => void, 
    onInsert: (element: FrameElement) => void, 
    onSplice: (element: FrameElement) => void) {
    super();
    this.renderLayer = renderLayer;
    this.frameTree = frameTree;
    this.onCommit = onCommit;
    this.onRevert = onRevert;
    this.onGenerate = onGenerate;
    this.onScribble = onScribble;
    this.onInsert = onInsert;
    this.onSplice = onSplice;
    this.cursorPosition = [-1, -1];

    const unit = iconUnit;
    const isFrameActive = () => this.interactable && this.focusedLayout && !this.pointerHandler;
    const isFrameActiveAndVisible = () => this.interactable && 0 < this.focusedLayout?.element.visibility && !this.pointerHandler;
    this.splitHorizontalIcon = new ClickableIcon("split-horizontal.png",unit,[0.5,0.5],"横に分割", isFrameActiveAndVisible);
    this.splitVerticalIcon = new ClickableIcon("split-vertical.png",unit,[0.5,0.5],"縦に分割", isFrameActiveAndVisible);
    this.deleteIcon = new ClickableIcon("delete.png",unit,[1,0],"削除", isFrameActive);
    this.duplicateIcon = new ClickableIcon("duplicate.png",unit,[1,0],"複製", isFrameActive);
    this.insertIcon = new ClickableIcon("insert.png",unit,[1,0],"画像のシフト", isFrameActive);
    this.spliceIcon = new ClickableIcon("splice.png",unit,[1,0],"画像のアンシフト", isFrameActive);
    this.zplusIcon = new ClickableIcon("zplus.png",unit,[0,0],"手前に", isFrameActiveAndVisible);
    this.zminusIcon = new ClickableIcon("zminus.png",unit,[0,0],"奥に", isFrameActiveAndVisible);
    this.visibilityIcon = new MultistateIcon(["visibility1.png","visibility2.png","visibility3.png"],unit,[0,0], "不可視/背景と絵/枠線も", isFrameActive);
    this.visibilityIcon.index = 2;
    this.showsScribbleIcon = new MultistateIcon(["scribble-hide.png","scribble-show.png"],unit,[0,1], "落書きの表示/非表示", isFrameActiveAndVisible);
    this.showsScribbleIcon.index = 1;

    const isImageActive = () => this.interactable && this.focusedLayout?.element.image && !this.pointerHandler;
    this.scaleIcon = new ClickableIcon("scale.png",unit,[1,1],"スケール", () => this.interactable && this.focusedLayout?.element.image != null);
    this.rotateIcon = new ClickableIcon("rotate.png",unit,[1,1],"回転", () => this.interactable && this.focusedLayout?.element.image != null);
    this.dropIcon = new ClickableIcon("drop.png",unit,[0,1],"画像除去", isImageActive);
    this.flipHorizontalIcon = new ClickableIcon("flip-horizontal.png",unit,[0,1],"左右反転", isImageActive);
    this.flipVerticalIcon = new ClickableIcon("flip-vertical.png",unit,[0,1],"上下反転", isImageActive);
    this.fitIcon = new ClickableIcon("fit.png",unit,[0,1],"フィット", isImageActive);
    this.generateIcon = new ClickableIcon("generate-image.png",unit,[0,1],"画像生成", isFrameActiveAndVisible);
    this.scribbleIcon = new ClickableIcon("scribble.png",unit,[0,1],"落書き", isFrameActiveAndVisible);

    const isBorderActive = (dir) => this.interactable && this.focusedBorder?.layout.dir === dir;
    this.expandHorizontalIcon = new ClickableIcon("expand-horizontal.png",unit,[0.5,1],"幅を変更", () => isBorderActive('h'));
    this.slantHorizontalIcon = new ClickableIcon("slant-horizontal.png", unit,[0.5,0],"傾き", () => isBorderActive('h'));
    this.expandVerticalIcon = new ClickableIcon("expand-vertical.png",unit,[1,0.5],"幅を変更", () => isBorderActive('v'));
    this.slantVerticalIcon = new ClickableIcon("slant-vertical.png", unit,[0,0.5],"傾き", () => isBorderActive('v'));

    this.frameIcons = [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.duplicateIcon, this.insertIcon, this.spliceIcon, this.zplusIcon, this.zminusIcon, this.visibilityIcon, this.scaleIcon, this.rotateIcon, this.dropIcon, this.flipHorizontalIcon, this.flipVerticalIcon, this.fitIcon, this.generateIcon, this.scribbleIcon, this.showsScribbleIcon];
    this.borderIcons = [this.slantVerticalIcon, this.expandVerticalIcon, this.slantHorizontalIcon, this.expandHorizontalIcon];
  }

  prerender(): void {
    this.renderLayer.setFrameTree(this.frameTree);
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.interactable) { return; }
    if (depth !== 0) { return; }

    if (0 < this.focusedLayout?.element.visibility) {  // z値を表示
      ctx.font = '24px serif';
      ctx.fillStyle = "#86C8FF";
      const l = this.focusedLayout;
      ctx.fillText(l.element.z.toString(), l.origin[0]+74, l.origin[1]+38);
    }

    if (this.focusedPadding) {
      ctx.fillStyle = "rgba(200,200,0, 0.7)";
      ctx.beginPath();
      trapezoidPath(ctx, this.focusedPadding.trapezoid);
      ctx.fill();
    }

    if (this.focusedBorder) {
      ctx.fillStyle = "rgba(0,200,200,0.7)";
      ctx.beginPath();
      trapezoidPath(ctx, this.focusedBorder.trapezoid);
      ctx.fill();
    }

    if (this.focusedLayout) {
      ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
      ctx.strokeRect(...this.focusedLayout.rawOrigin, ...this.focusedLayout.rawSize);
    }

    this.frameIcons.forEach(icon => icon.render(ctx));
    this.borderIcons.forEach(icon => icon.render(ctx));
  }

  dropped(position: Vector, image: HTMLImageElement): boolean {
    if (!this.interactable) { return; }

    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getPaperSize(),
      [0, 0]
    );
    let layoutlet = findLayoutAt(layout, position);
    if (!layoutlet) {
      return false;
    }

    this.importImage(layoutlet, image);
    this.onCommit();
    return true;
  }

  updateFocus(point: Vector): void {
    const layout = calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);

    this.focusedPadding = null;
    this.focusedBorder = null;
    this.focusedLayout = null;

    if (keyDownFlags["KeyB"]) {
      this.focusedPadding = findPaddingAt(layout, point);
      return;
    }

    this.focusedLayout = findLayoutAt(layout, point);
    if (this.focusedLayout) {
      const cp = (ro, ou) => ClickableIcon.calcPosition([origin[0]+10, origin[1]+10, size[0]-20, size[1]-20],iconUnit, ro, ou);
      const origin = this.focusedLayout.origin;
      const size = this.focusedLayout.size;
      this.splitHorizontalIcon.position = cp([0.5,0.5],[1,0]);
      this.splitVerticalIcon.position = cp([0.5,0.5],[0,1]);
      this.deleteIcon.position = cp([1,0],[0,0]);
      this.duplicateIcon.position = cp([1,0],[0,1]);
      this.insertIcon.position = cp([1,0],[0,2]);
      this.spliceIcon.position = cp([1,0],[0,3]);
      this.zplusIcon.position = cp([0,0],[2.5,0]);
      this.zminusIcon.position = cp([0,0],[1,0]);
      this.visibilityIcon.position = cp([0,0],[0,0]);
      this.visibilityIcon.index = this.focusedLayout.element.visibility;
      this.showsScribbleIcon.position = cp([0,1],[0,-4]);
      this.showsScribbleIcon.index = this.focusedLayout.element.showsScribble ? 1 : 0;

      this.scaleIcon.position = cp([1,1],[0,0]);
      this.rotateIcon.position = cp([1,1],[-1,0]);
      this.dropIcon.position = cp([0,1],[0,0]);
      this.flipHorizontalIcon.position = cp([0,1], [2,0]);
      this.flipVerticalIcon.position = cp([0,1], [3,0]);
      this.fitIcon.position = cp([0,1], [4,0]);
      this.generateIcon.position = cp([0,1], [0,-2]);
      this.scribbleIcon.position = cp([0,1], [0,-3]);
      this.redraw();

      // アイコンはボーダーに優先
      for (let e of this.frameIcons) {
        if (e.contains(point)) {
          return;
        }
      }
    }

    this.focusedBorder = findBorderAt(layout, point);
    if (this.focusedBorder) {
      this.focusedLayout = null;
      this.updateBorderIconPositions(this.focusedBorder);
      this.redraw();
    } 
  }

  pointerHover(position: Vector): boolean {
    this.cursorPosition = position;
    if(!position) {
      this.focusedLayout = null;
      return false;
    }
    if (keyDownFlags["Space"]) { return; }
    this.updateFocus(position);

    if (this.focusedLayout) {
      const origin = this.focusedLayout.origin;
      const size = this.focusedLayout.size;
      const x = origin[0] + size[0] / 2;
      if (this.hintIfContains(position, this.frameIcons)) {
      } else if (this.focusedLayout.element.image) {
        this.hint([x, origin[1] - 8],"ドラッグで移動、Ctrl+ドラッグでスケール、Alt+ドラッグで回転");
      } else if (0 < this.focusedLayout.element.visibility) {
        this.hint([x, origin[1] + 48], "画像をドロップ");
      } else {
        this.hint([x, origin[1] + 48], null);
      }
    } else if (this.focusedPadding) {
      this.hint(position, "ドラッグでパディング変更");
      this.redraw();
    } else if (!this.hintIfContains(position, this.borderIcons)) {
      this.hint(position, null);
    }
    return;
}

  async keyDown(position: Vector, event: KeyboardEvent): Promise<boolean> {
    if (event.code === "KeyV" && event.ctrlKey) {
      try {
        const items = await navigator.clipboard.read();
  
        for (let item of items) {
          for (let type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const url = URL.createObjectURL(blob);
              const image = new Image();
              image.src = url;
              image.onload = () => {
                this.dropped(this.cursorPosition, image);
              };
              return true;
            }
          }
        }
      }
      catch(err) {
        console.error('ユーザが拒否、もしくはなんらかの理由で失敗', err);
      }
    }
    return false;
  }

  accepts(point: Vector): any {
    if (!this.interactable) {return null;}
    if (keyDownFlags["Space"]) {return null;}

    this.updateFocus(point);

    if (keyDownFlags["KeyB"]) {
      if (this.focusedPadding) {
        return { padding: this.focusedPadding };
      }
    }

    if (this.focusedBorder) {
      if (keyDownFlags["KeyT"]) {
        const target = this.focusedBorder.layout.element.children[this.focusedBorder.index-1];
        FrameElement.transposeDivider(this.frameTree, target);
        this.onCommit();
        this.redraw();
        return null;
      } else {
        return { border: this.focusedBorder };
      }
    }

    const layout = this.focusedLayout;
    if (layout) {
      if (keyDownFlags["KeyQ"]) {
        FrameElement.eraseElement(this.frameTree, layout.element);
        this.onCommit();
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyW"]) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layout.element
        );
        this.onCommit();
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyS"]) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layout.element
        );
        this.onCommit();
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyD"]) {
        layout.element.image = null;
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyT"]) {
        layout.element.reverse[0] *= -1;
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyY"]) {
        layout.element.reverse[1] *= -1;
        this.redraw();
        return null;
      }
      if (keyDownFlags["KeyE"]) {
        constraintLeaf(layout);
        this.redraw();
        return null;
      }
      if (this.splitHorizontalIcon.contains(point)) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layout.element
        );
        this.onCommit();
        this.focusedLayout = null;
        this.redraw();
        return null;
      }
      if (this.splitVerticalIcon.contains(point)) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layout.element
        );
        this.onCommit();
        this.focusedLayout = null;
        this.redraw();
        return null;
      }
      if (this.deleteIcon.contains(point)) {
        FrameElement.eraseElement(this.frameTree, layout.element);
        this.onCommit();
        this.focusedLayout = null;
        this.redraw();
        return null;
      }
      if (this.duplicateIcon.contains(point)) {
        FrameElement.duplicateElement(this.frameTree, layout.element);
        this.onCommit();
        this.updateFocus(point);
        this.redraw();
        return null;
      }
      if (this.insertIcon.contains(point)) {
        this.onInsert(layout.element);
        this.redraw();
        return null;
      }
      if (this.spliceIcon.contains(point)) {
        this.onSplice(layout.element);
        this.redraw();
        return null;
      }
      if (this.zplusIcon.contains(point)) {
        layout.element.z += 1;
        this.onCommit();
        this.redraw();
        return null;
      }
      if (this.zminusIcon.contains(point)) {
        layout.element.z -= 1;
        this.onCommit();
        this.redraw();
        return null;
      }
      if (this.visibilityIcon.contains(point)) {
        this.visibilityIcon.increment();
        layout.element.visibility = this.visibilityIcon.index;
        this.onCommit();
        this.redraw();
        return null;
      }
      if (this.showsScribbleIcon.contains(point)) {
        this.showsScribbleIcon.increment();
        layout.element.showsScribble = this.showsScribbleIcon.index === 1;
        this.onCommit();
        this.redraw();
        return null;
      }

      if (this.dropIcon.contains(point)) {
        layout.element.image = null;
        this.onCommit();
        this.redraw();
      } else if (this.flipHorizontalIcon.contains(point)) {
        layout.element.reverse[0] *= -1;
        this.redraw();
      } else if (this.flipVerticalIcon.contains(point)) {
        layout.element.reverse[1] *= -1;
        this.redraw();
      } else if (this.fitIcon.contains(point)) {
        layout.element.scale = [0.001, 0.001];
        constraintLeaf(layout);
        this.onCommit();
        this.redraw();
      } else if (this.generateIcon.contains(point)) {
        this.onGenerate(layout.element);
      } else if (this.scribbleIcon.contains(point)) {
        this.onScribble(layout.element);
      } else {
        return { layout: layout };
      }
    }

    return null;
  }

  async *pointer(p: Vector, payload: any) {
    if (payload.layout) {
      const layout = payload.layout;
      const element = layout.element;
      if (element.image) {
        if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] || 
            this.scaleIcon.contains(p)) {
          yield* this.scaleImage(p, layout);
        } else if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"] ||
                  this.rotateIcon.contains(p)) {
          yield* this.rotateImage(p, layout);
        } else {
          yield* this.translateImage(p, layout);
        }
      }
    } else if (payload.padding) {
      yield* this.expandPadding(p, payload.padding);
    } else {
      if (
        keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] ||
         this.expandHorizontalIcon.contains(p) ||this.expandVerticalIcon.contains(p)) {
        yield* this.expandBorder(p, payload.border);
      } else if (
        keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"] ||
        this.slantHorizontalIcon.contains(p) || this.slantVerticalIcon.contains(p)) {
        yield* this.slantBorder(p, payload.border);
      } else {
        yield* this.moveBorder(p, payload.border);
      }
    }
  }

  *scaleImage(p: Vector, layout: Layout) {
    const element = layout.element;
    const origin = element.scale[0];
    const size = layout.size;
    try {
      yield* scale(this.getPaperSize(), p, (q) => {
        const s = Math.max(q[0], q[1]);
        element.scale = [origin * s, origin * s];
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(layout);
        }
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
    this.onCommit();
  }

  *rotateImage(p: Vector, layout: Layout) {
    const element = layout.element;
    const originalRotation = element.rotation;
    try {
      yield* rotate(p, (q) => {
        element.rotation = Math.max(-180, Math.min(180, originalRotation + -q * 0.2));
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(layout);
        }
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
    this.onCommit();
  }

  *translateImage(p: Vector, layout: Layout) {
    const element = layout.element;
    const origin = element.translation;
    try {
      yield* translate(p, (q) => {
        element.translation = [origin[0] + q[0], origin[1] + q[1]];
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(layout);
        }
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
    if (element.translation !== origin) {
      this.onCommit();
    }
  }

  *moveBorder(p: Vector, border: Border) {
    const layout = border.layout;
    const index = border.index;

    const child0 = layout.children[index - 1];
    const child1 = layout.children[index];

    const c0 = child0.element;
    const c1 = child1.element;
    const rawSpacing = c0.divider.spacing;
    const rawSum = c0.rawSize + rawSpacing + c1.rawSize;

    try {
      while ((p = yield)) {
        const balance = this.getBorderBalance(p, border);
        const t = balance * rawSum;
        c0.rawSize = t - rawSpacing * 0.5;
        c1.rawSize = rawSum - t - rawSpacing * 0.5;
        this.updateBorder(border);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }
    this.onCommit();
  }

  *expandBorder(p: Vector, border: Border) {
    const element = border.layout.element;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const prev = border.layout.children[border.index-1].element;
    const curr = border.layout.children[border.index].element;
    const startSpacing = prev.divider.spacing;
    const s = p;
    const startPrevRawSize = prev.rawSize;
    const startCurrRawSize = curr.rawSize;
    const factor = 0.005 * (startPrevRawSize + startCurrRawSize) * border.layout.size[dir] / this.getPaperSize()[dir];

    try {
      while ((p = yield)) {
        const op = p[dir] - s[dir];
        prev.divider.spacing = Math.max(0, startSpacing + op * factor * 0.1);
        const diff = prev.divider.spacing - startSpacing;
  
        prev.rawSize = startPrevRawSize - diff*0.5;
        curr.rawSize = startCurrRawSize - diff*0.5;
  
        element.calculateLengthAndBreadth();
        this.updateBorder(border);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }

    this.onCommit();
  }

  *slantBorder(p: Vector, border: Border) {
    const element = border.layout.element;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const prev = border.layout.children[border.index-1].element;
    const curr = border.layout.children[border.index].element;
    const rawSlant = prev.divider.slant;

    const s = p;
    try {
      while ((p = yield)) {
        const op = p[dir] - s[dir];
        prev.divider.slant = Math.max(-42, Math.min(42, rawSlant + op * 0.2));
        this.updateBorder(border);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }

    this.onCommit();
  }

  *expandPadding(p: Vector, padding: PaddingHandle) {
    const element = padding.layout.element;
    const dir = padding.handle === "top" || padding.handle === "bottom" ? 1 : 0;
    const deltaFactor = padding.handle === "right" || padding.handle === "bottom" ? -1 : 1;
    const rawSize = padding.layout.rawSize;
    const s = p;
    const initialPadding = element.padding[padding.handle] * rawSize[dir];

    try {
      while ((p = yield)) {
        const delta = p[dir] - s[dir];
        const currentPadding = initialPadding + delta * deltaFactor;
        element.padding[padding.handle] = currentPadding / rawSize[dir];
        this.updatePadding(padding);
        this.redraw();
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }

    this.onCommit();
  }

  getBorderBalance(p: Vector, border: Border) {
    const layout = border.layout;
    const index = border.index;

    const child0 = layout.children[index - 1];
    const child1 = layout.children[index];

    const rect0 = rectFromBox(child0.origin, child0.size);
    const rect1 = rectFromBox(child1.origin, child1.size);

    let t; // 0.0 - 1.0, 0.0: top or left of rect0, 1.0: right or bottom of rect1
    if (layout.dir == "h") {
      t = 1.0 - (p[0] - rect1[0]) / (rect0[2] - rect1[0]);
    } else {
      t = (p[1] - rect0[1]) / (rect1[3] - rect0[1]);
    }
    return t;
  }

  constraintAll(): void {
    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getPaperSize(),
      [0, 0]
    );
    constraintRecursive(layout);
  }

  importImage(layoutlet: Layout, image: HTMLImageElement): void {
    const size = [image.naturalWidth, image.naturalHeight];
    // calc expansion to longer size
    const scale = Math.max(
      layoutlet.size[0] / size[0],
      layoutlet.size[1] / size[1]
    );

    layoutlet.element.translation = [0, 0];
    layoutlet.element.scale = [scale, scale];
    layoutlet.element.image = image;
    layoutlet.element.rotation = 0;
    layoutlet.element.gallery.push(image);
      
    constraintLeaf(layoutlet);
    this.redraw();
  }

  hintIfContains(p: Vector, a: BaseIcon[]): boolean {
    for (let e of a) {
      if (e.hintIfContains(p, this.hint)) {
        return true;
      }
    }
    return false;
  }

  updatePadding(padding: PaddingHandle): void {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    const newLayout = findLayoutOf(rootLayout, padding.layout.element);
    padding.layout = newLayout;
    this.updatePaddingTrapezoid(padding);
  }

  updatePaddingTrapezoid(padding: PaddingHandle): void {
    const pt = makePaddingTrapezoid(padding.layout, padding.handle);
    padding.trapezoid = pt;
  }

  updateBorder(border: Border): void {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    const newLayout = findLayoutOf(rootLayout, border.layout.element);
    border.layout = newLayout;
    this.updateBorderTrapezoid(border);
  }

  updateBorderTrapezoid(border: Border): void {
    const bt = makeBorderTrapezoid(border.layout, border.index);
    border.trapezoid = bt;
    this.updateBorderIconPositions(border);
  }

  updateBorderIconPositions(border: Border): void {
    const bt = border.trapezoid;
    this.slantVerticalIcon.position = [bt.topLeft[0],(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5];
    this.expandVerticalIcon.position = [bt.topRight[0],(bt.topRight[1] + bt.bottomRight[1]) * 0.5];
    this.slantHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5,bt.topLeft[1]];
    this.expandHorizontalIcon.position = [(bt.bottomLeft[0] + bt.bottomRight[0]) * 0.5,bt.bottomLeft[1]];
  }

  beforeDoubleClick(p: Vector): boolean {
    for (let e of this.frameIcons) {
      const r = e.boudingRect();
      if (e.contains(p)) {
        return true;
      }
    }
    for (let e of this.borderIcons) {
      if (e.contains(p)) {
        return true;
      }
    }
    return false;
  }

  renderDepths(): number[] { return [0]; }

  get interactable(): boolean { return this.mode == null; }
}
sequentializePointer(FrameLayer);
