import { Layer, sequentializePointer, type Viewport } from "../system/layeredCanvas";
import { FrameElement, type Layout,type Border, type PaddingHandle, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findPaddingOn, findPaddingOf, makeBorderCorners, makeBorderFormalCorners, calculateOffsettedCorners } from "../dataModels/frameTree";
import { constraintRecursive, constraintLeaf } from "../dataModels/frameTree";
import { translate, scale, rotate } from "../tools/pictureControl";
import { keyDownFlags } from "../system/keyCache";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { extendTrapezoid, isPointInTrapezoid, trapezoidCorners, trapezoidPath } from "../tools/geometry/trapezoid";
import { type Vector, type Rect, type Box, box2Rect, add2D, vectorEquals } from '../tools/geometry/geometry';
import type { PaperRendererLayer } from "./paperRendererLayer";
import type { RectHandle } from "../tools/rectHandle";
import { drawSelectionFrame } from "../tools/draw/selectionFrame";

const iconUnit: Vector = [32,32];
const BORDER_MARGIN = 10;

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
  visibilityIcon: ClickableIcon;
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
  showsScribbleIcon: ClickableIcon;

  frameIcons: ClickableIcon[];
  borderIcons: ClickableIcon[];

  litLayout: Layout;
  litBorder: Border;
  selectedLayout: Layout;
  selectedBorder: Border;
  focusedPadding: PaddingHandle;
  pointerHandler: any;
  canvasPattern: CanvasPattern;

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
    const mp = () => this.paper.matrix;
    const isFrameActive = () => this.interactable && this.selectedLayout && !this.pointerHandler;
    const isFrameActiveAndVisible = () => this.interactable && 0 < this.selectedLayout?.element.visibility && !this.pointerHandler;
    this.splitHorizontalIcon = new ClickableIcon(["split-horizontal.png"],unit,[0.5,0.5],"横に分割", isFrameActiveAndVisible, mp);
    this.splitVerticalIcon = new ClickableIcon(["split-vertical.png"],unit,[0.5,0.5],"縦に分割", isFrameActiveAndVisible, mp);
    this.deleteIcon = new ClickableIcon(["delete.png"],unit,[1,0],"削除", isFrameActive, mp);
    this.duplicateIcon = new ClickableIcon(["duplicate.png"],unit,[1,0],"複製", isFrameActive, mp);
    this.insertIcon = new ClickableIcon(["insert.png"],unit,[1,0],"画像のシフト", isFrameActive, mp);
    this.spliceIcon = new ClickableIcon(["splice.png"],unit,[1,0],"画像のアンシフト", isFrameActive, mp);
    this.zplusIcon = new ClickableIcon(["zplus.png"],unit,[0,0],"手前に", isFrameActiveAndVisible, mp);
    this.zminusIcon = new ClickableIcon(["zminus.png"],unit,[0,0],"奥に", isFrameActiveAndVisible, mp);
    this.visibilityIcon = new ClickableIcon(["visibility1.png","visibility2.png","visibility3.png"],unit,[0,0], "不可視/背景と絵/枠線も", isFrameActive, mp);
    this.visibilityIcon.index = 2;
    this.showsScribbleIcon = new ClickableIcon(["scribble-hide.png","scribble-show.png"],unit,[0,1], "落書きの表示/非表示", isFrameActiveAndVisible, mp);
    this.showsScribbleIcon.index = 1;

    const isImageActive = () => this.interactable && this.selectedLayout?.element.image && !this.pointerHandler;
    this.scaleIcon = new ClickableIcon(["scale.png"],unit,[1,1],"スケール", () => this.interactable && this.selectedLayout?.element.image != null, mp);
    this.rotateIcon = new ClickableIcon(["rotate.png"],unit,[1,1],"回転", () => this.interactable && this.selectedLayout?.element.image != null, mp);
    this.dropIcon = new ClickableIcon(["drop.png"],unit,[0,1],"画像除去", isImageActive, mp);
    this.flipHorizontalIcon = new ClickableIcon(["flip-horizontal.png"],unit,[0,1],"左右反転", isImageActive, mp);
    this.flipVerticalIcon = new ClickableIcon(["flip-vertical.png"],unit,[0,1],"上下反転", isImageActive, mp);
    this.fitIcon = new ClickableIcon(["fit.png"],unit,[0,1],"フィット", isImageActive, mp);
    this.generateIcon = new ClickableIcon(["generate-image.png"],unit,[0,1],"画像生成", isFrameActiveAndVisible, mp);
    this.scribbleIcon = new ClickableIcon(["scribble.png"],unit,[0,1],"落書き", isFrameActiveAndVisible, mp);

    const isBorderActive = (dir) => this.interactable && this.selectedBorder?.layout.dir === dir;
    this.expandHorizontalIcon = new ClickableIcon(["expand-horizontal.png"],unit,[0.5,1],"幅を変更", () => isBorderActive('h'), mp);
    this.slantHorizontalIcon = new ClickableIcon(["slant-horizontal.png"], unit,[0.5,0],"傾き", () => isBorderActive('h'), mp);
    this.expandVerticalIcon = new ClickableIcon(["expand-vertical.png"],unit,[1,0.5],"幅を変更", () => isBorderActive('v'), mp);
    this.slantVerticalIcon = new ClickableIcon(["slant-vertical.png"], unit,[0,0.5],"傾き", () => isBorderActive('v'), mp);

    this.frameIcons = [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.duplicateIcon, this.insertIcon, this.spliceIcon, this.zplusIcon, this.zminusIcon, this.visibilityIcon, this.scaleIcon, this.rotateIcon, this.dropIcon, this.flipHorizontalIcon, this.flipVerticalIcon, this.fitIcon, this.generateIcon, this.scribbleIcon, this.showsScribbleIcon];
    this.borderIcons = [this.slantVerticalIcon, this.expandVerticalIcon, this.slantHorizontalIcon, this.expandHorizontalIcon];

    this.makeCanvasPattern();
  }

  makeCanvasPattern() {
    const pcanvas = document.createElement("canvas");
    pcanvas.width = 16;
    pcanvas.height = 16;
    const pctx = pcanvas.getContext("2d");
    pctx.strokeStyle = "rgba(0, 200, 200, 0.4)";
    pctx.lineWidth = 6;
    pctx.beginPath();

    const slope = 1;
    for (let y = -16; y < 32; y += 16) {
      pctx.moveTo(-8, y);
      pctx.lineTo(72, y + 80 * slope);
    }
    pctx.stroke();
    this.canvasPattern = pctx.createPattern(pcanvas, 'repeat');
  }

  prerender(): void {
    this.renderLayer.setFrameTree(this.frameTree);
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.interactable) { return; }
    if (depth !== 0) { return; }

    if (0 < this.selectedLayout?.element.visibility) {  // z値を表示
      ctx.font = '24px serif';
      ctx.fillStyle = "#86C8FF";
      const l = this.selectedLayout;
      ctx.fillText(l.element.z.toString(), l.rawOrigin[0]+74, l.rawOrigin[1]+38);
    }

    if (this.focusedPadding) {
      ctx.fillStyle = "rgba(200,200,0, 0.7)";
      ctx.beginPath();
      trapezoidPath(ctx, this.focusedPadding.corners);
      ctx.fill();
    }

    if (this.litBorder) {
      ctx.fillStyle = "rgba(0, 200,200, 0.2)";
      ctx.beginPath();
      trapezoidPath(ctx, this.litBorder.formalCorners);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 1)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      trapezoidPath(ctx, this.litBorder.corners);
      ctx.stroke();
      for (let position of trapezoidCorners) {
        ctx.moveTo(...this.litBorder.formalCorners[position]);
        ctx.lineTo(...this.litBorder.corners[position]);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 200,200, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      trapezoidPath(ctx, this.litBorder.corners);
      ctx.stroke();
      for (let position of trapezoidCorners) {
        ctx.moveTo(...this.litBorder.formalCorners[position]);
        ctx.lineTo(...this.litBorder.corners[position]);
      }
      ctx.stroke();
    } else if (this.litLayout) {
      ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
      // ctx.fillRect(...this.litLayout.rawOrigin, ...this.litLayout.rawSize);
      ctx.beginPath();
      trapezoidPath(ctx, this.litLayout.formalCorners);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 1)";
      ctx.lineWidth = 6
      for (let position of trapezoidCorners) {
        ctx.moveTo(...this.litLayout.formalCorners[position]);
        ctx.lineTo(...this.litLayout.corners[position]);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 0, 255, 0.4)";
      ctx.lineWidth = 3;
      for (let position of trapezoidCorners) {
        ctx.moveTo(...this.litLayout.formalCorners[position]);
        ctx.lineTo(...this.litLayout.corners[position]);
      }
      ctx.stroke();
    }

    if (this.selectedBorder) {
      ctx.fillStyle = this.canvasPattern;
      ctx.beginPath();
      trapezoidPath(ctx, this.selectedBorder.corners);
      ctx.fill();
    } else if (this.selectedLayout) {
      drawSelectionFrame(ctx, "rgba(0, 128, 255, 1)", this.selectedLayout.corners);
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

  updateLit(point: Vector): void {
    const layout = calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);

    this.focusedPadding = null;
    this.litBorder = null;
    this.litLayout = null;

    if (this.selectedLayout) {
      const corners = extendTrapezoid(this.selectedLayout.corners, 20, 20);
      if (isPointInTrapezoid(point, corners)) {
        const padding = findPaddingOn(this.selectedLayout, point);
        this.focusedPadding = padding;
        return;
      }
    }

    if (this.selectedBorder) {
      if (isPointInTrapezoid(point, this.selectedBorder.corners)) {
        this.litBorder = this.selectedBorder;
        return;
      }
    }

    this.litBorder = findBorderAt(layout, point, BORDER_MARGIN);
    if (!this.litBorder) {
      this.litLayout = findLayoutAt(layout, point);
    }
  }

  updateSelected() {
    if (this.selectedLayout) {
      const cp = (ro, ou) => ClickableIcon.calcPosition([origin[0]+10, origin[1]+10, size[0]-20, size[1]-20],iconUnit, ro, ou);
      const origin = this.selectedLayout.rawOrigin;
      const size = this.selectedLayout.rawSize;
      this.splitHorizontalIcon.position = cp([0.5,0.5],[1,0]);
      this.splitVerticalIcon.position = cp([0.5,0.5],[0,1]);
      this.deleteIcon.position = cp([1,0],[0,0]);
      this.duplicateIcon.position = cp([1,0],[0,1]);
      this.insertIcon.position = cp([1,0],[0,2]);
      this.spliceIcon.position = cp([1,0],[0,3]);
      this.zplusIcon.position = cp([0,0],[2.5,0]);
      this.zminusIcon.position = cp([0,0],[1,0]);
      this.visibilityIcon.position = cp([0,0],[0,0]);
      this.visibilityIcon.index = this.selectedLayout.element.visibility;
      this.showsScribbleIcon.position = cp([0,1],[0,-4]);
      this.showsScribbleIcon.index = this.selectedLayout.element.showsScribble ? 1 : 0;

      this.scaleIcon.position = cp([1,1],[0,0]);
      this.rotateIcon.position = cp([1,1],[-1,0]);
      this.dropIcon.position = cp([0,1],[0,0]);
      this.flipHorizontalIcon.position = cp([0,1], [2,0]);
      this.flipVerticalIcon.position = cp([0,1], [3,0]);
      this.fitIcon.position = cp([0,1], [4,0]);
      this.generateIcon.position = cp([0,1], [0,-2]);
      this.scribbleIcon.position = cp([0,1], [0,-3]);
      this.redraw();
    }

    if (this.selectedBorder) {
      this.selectedLayout = null;
      this.updateBorderIconPositions(this.selectedBorder);
      this.redraw();
    } 
  }

  pointerHover(position: Vector): boolean {
    this.cursorPosition = position;
    if(!position) {
      this.litLayout = null;
      this.litBorder = null;
      return false;
    }
    if (keyDownFlags["Space"]) { return; }
    this.updateLit(position);
    this.redraw();

    if (this.selectedLayout) {
      const origin = this.selectedLayout.origin;
      const size = this.selectedLayout.size;
      const x = origin[0] + size[0] / 2;
      if (this.hintIfContains(position, this.frameIcons)) {
      } else if (this.selectedLayout.element.image) {
        this.hint([x, origin[1] - 8],"ドラッグで移動、Ctrl+ドラッグでスケール、Alt+ドラッグで回転");
      } else if (0 < this.selectedLayout.element.visibility) {
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

    const paperSize = this.getPaperSize();

    this.updateLit(point);

    // パディング操作
    if (this.focusedPadding) {
      return { padding: this.focusedPadding };
    }

    // 選択ボーダー操作
    if (this.selectedBorder) {
      const r = this.acceptsOnSelectedBorder(point);
      if (r) {
        return r;
      }
      if (this.litBorder) {
        console.log(this.selectedBorder);
        console.log(this.litBorder);
        if (this.litBorder.layout.element != this.selectedBorder.layout.element ||
            this.litBorder.index != this.selectedBorder.index) {
          return { border: this.litBorder };
        }
      } else { 
        this.selectedBorder = null;
        this.updateSelected();
        this.redraw();
      } 
      // return null; このあとフレーム選択処理が入るかもしれないので放棄しない
    } else {
      if (this.litBorder) {
        if (keyDownFlags["KeyT"]) {
          const target = this.litBorder.layout.element.children[this.litBorder.index-1];
          FrameElement.transposeDivider(this.frameTree, target);
          this.onCommit();
          this.selectedLayout = null;
          this.litLayout = null;
          this.selectedBorder = null;
          this.litBorder = null;
          this.redraw();
          return null;
        } else {
          return { border: this.litBorder };
        }
      }
    }

    // 選択フレーム操作
    const r = this.acceptsOnSelectedFrame(point);
    if (r) {
      if (r == "done") {
        return null;
      }
      return r;
    }

    if (this.litLayout) {
      if (this.selectedLayout?.element != this.litLayout?.element) {
        console.log("litLayout", this.litLayout);
        this.selectedLayout = this.litLayout;
        this.updateSelected();
        this.redraw();
        return null;
      }
    } else {
      if (this.selectedLayout) {
        this.selectedLayout = null;
        this.updateSelected();
        this.redraw();
        return null;
      }
    }
  }

  acceptsOnSelectedBorder(p: Vector): any {
    if (
      keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] ||
       this.expandHorizontalIcon.contains(p) ||this.expandVerticalIcon.contains(p)) {
      return { border: this.selectedBorder, action: "expand" };
    } else if (
      keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"] ||
      this.slantHorizontalIcon.contains(p) || this.slantVerticalIcon.contains(p)) {
      return { border: this.selectedBorder, action: "slant" };
    } else if (isPointInTrapezoid(p, this.selectedBorder.corners)) {
      return { border: this.selectedBorder, action: "move" };
    }
    return null;
  }

  acceptsOnSelectedFrame(point: Vector): any {
    const layout = this.selectedLayout;
    if (layout) {
      const paperSize = this.getPaperSize();
      if (keyDownFlags["KeyQ"]) {
        FrameElement.eraseElement(this.frameTree, layout.element);
        this.litLayout = null;
        this.selectedLayout = null;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (keyDownFlags["KeyW"]) {
        this.litLayout = null;
        this.selectedLayout = null;
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layout.element
        );
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (keyDownFlags["KeyS"]) {
        this.litLayout = null;
        this.selectedLayout = null;
        FrameElement.splitElementVertical(
          this.frameTree,
          layout.element
        );
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (keyDownFlags["KeyD"]) {
        layout.element.image = null;
        this.redraw();
        return "done";
      }
      if (keyDownFlags["KeyT"]) {
        layout.element.image.reverse[0] *= -1;
        this.redraw();
        return "done";
      }
      if (keyDownFlags["KeyY"]) {
        layout.element.image.reverse[1] *= -1;
        this.redraw();
        return "done";
      }
      if (keyDownFlags["KeyE"]) {
        constraintLeaf(paperSize, layout);
        this.redraw();
        return "done";
      }
      if (this.splitHorizontalIcon.contains(point)) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layout.element
        );
        this.litLayout = null;
        this.selectedLayout = null;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.splitVerticalIcon.contains(point)) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layout.element
        );
        this.litLayout = null;
        this.selectedLayout = null;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.deleteIcon.contains(point)) {
        FrameElement.eraseElement(this.frameTree, layout.element);
        this.litLayout = null;
        this.selectedLayout = null;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.duplicateIcon.contains(point)) {
        FrameElement.duplicateElement(this.frameTree, layout.element);
        this.litLayout = null;
        this.selectedLayout = null;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.insertIcon.contains(point)) {
        this.onInsert(layout.element);
        this.redraw();
        return "done";
      }
      if (this.spliceIcon.contains(point)) {
        this.onSplice(layout.element);
        this.redraw();
        return "done";
      }
      if (this.zplusIcon.contains(point)) {
        layout.element.z += 1;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.zminusIcon.contains(point)) {
        layout.element.z -= 1;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.visibilityIcon.contains(point)) {
        this.visibilityIcon.increment();
        layout.element.visibility = this.visibilityIcon.index;
        this.onCommit();
        this.redraw();
        return "done";
      }
      if (this.showsScribbleIcon.contains(point)) {
        this.showsScribbleIcon.increment();
        layout.element.showsScribble = this.showsScribbleIcon.index === 1;
        this.onCommit();
        this.redraw();
        return "done";
      }

      if (this.dropIcon.contains(point)) {
        layout.element.image = null;
        this.onCommit();
        this.redraw();
        return "done";
      } else if (this.flipHorizontalIcon.contains(point)) {
        layout.element.image.reverse[0] *= -1;
        this.redraw();
        return "done";
      } else if (this.flipVerticalIcon.contains(point)) {
        layout.element.image.reverse[1] *= -1;
        this.redraw();
        return "done";
      } else if (this.fitIcon.contains(point)) {
        layout.element.image.n_scale = 0.001;
        constraintLeaf(paperSize, layout);
        this.onCommit();
        this.redraw();
        return "done";
      } else if (this.generateIcon.contains(point)) {
        this.onGenerate(layout.element);
        return "done";
      } else if (this.scribbleIcon.contains(point)) {
        this.onScribble(layout.element);
        return "done";
      } else {
        if (isPointInTrapezoid(point, layout.corners)) {
          return { layout: layout };
        }
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
      this.selectedBorder = payload.border;
      this.updateSelected();
      this.redraw();
      console.log("A", payload.border);
      if (payload.action === "expand") {
        yield* this.expandBorder(p, payload.border);
      } else if(payload.action === "slant") {
        yield* this.slantBorder(p, payload.border);
      } else {
        yield* this.moveBorder(p, payload.border);
      }
    }
  }

  *scaleImage(p: Vector, layout: Layout) {
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const origin = element.getPhysicalImageScale(paperSize);

    try {
      yield* scale(this.getPaperSize(), p, (q) => {
        const s = Math.max(q[0], q[1]);
        element.setPhysicalImageScale(paperSize, origin * s);
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(paperSize, layout);
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
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const originalRotation = element.image.rotation;

    try {
      yield* rotate(p, (q) => {
        element.image.rotation = Math.max(-180, Math.min(180, originalRotation + -q * 0.2));
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(paperSize, layout);
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
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const origin = element.getPhysicalImageTranslation(paperSize);
    const n_origin = element.image.n_translation;

    try {
      yield* translate(p, (q) => {
        element.setPhysicalImageTranslation(paperSize, [origin[0] + q[0], origin[1] + q[1]]);
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(paperSize, layout);
        }
        this.redraw();
      });
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
    if (element.image.n_translation !== n_origin) {
      this.onCommit();
    }
  }

  *moveBorder(p: Vector, border: Border) {
    const layout = border.layout;
    const index = border.index;

    let i0 = index - 1;
    let i1 = index;
    if (layout.dir === "h") {[i0, i1] = [i1, i0];}

    const child0 = layout.children[i0];
    const child1 = layout.children[i1];

    const c0 = child0.element;
    const c1 = child1.element;
    const rawSpacing = layout.children[index-1].element.divider.spacing; // dont use i0
    const rawSum = c0.rawSize + rawSpacing + c1.rawSize;

    function getRect(): Rect {
      return box2Rect([child0.origin, add2D(child1.origin, child1.size)]);
    }

    function getBalance(p: Vector) {
      const r = getRect();
      // 0.0 - 1.0, 0.0: top or left of box0, 1.0: right or bottom of box1
      if (layout.dir == "h") {
        return (p[0] - r[0]) / r[2];
      } else {
        const r = getRect();
        return (p[1] - r[1]) / r[3];
      }
    }

    function getCenter(): Vector {
      const r = getRect();
      return [r[0] + r[2] / 2, r[1] + r[3] / 2];
    }
  
    try {
      const s: Vector = p;
      let q = p;
      const startBalance = (c0.rawSize + rawSpacing * 0.5) / rawSum;
      const delta = getBalance(p) - startBalance;
      while ((p = yield)) {
        const balance = getBalance(p) - delta;
        const t = balance * rawSum;
        c0.rawSize = t - rawSpacing * 0.5;
        c1.rawSize = rawSum - t - rawSpacing * 0.5;
        this.updateBorder(border);
        this.redraw();
        q = p;
      }
      if (!vectorEquals(s, q)) {
        this.onCommit();  
      }
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      }
    }
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
    const dir = border.layout.dir == "h" ? 0 : 1;
    const prev = border.layout.children[border.index-1].element;
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
    const rawSize = padding.layout.rawSize;
    const corners = padding.layout.corners;
    const handle = padding.handle;

    const cornerHandles: RectHandle[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

    try {
      if (cornerHandles.indexOf(handle) !== -1) {
        // padding.handleが角の場合
        const q = element.cornerOffsets[handle];
        const s = p;
        while ((p = yield)) {
          const delta = [p[0] - s[0], p[1] - s[1]];
          element.cornerOffsets[handle] = [q[0] + delta[0] / rawSize[0], q[1] + delta[1] / rawSize[1]];
          this.updateSelectedLayout();
          this.redraw();
        }
      } else {
        // padding.handleが辺の場合
        let c0: string, c1: string;
        let direction: string;
        switch (handle) {
          case "top":
            c0 = "topLeft";
            c1 = "topRight";
            direction = "vertical";
            break;
          case "bottom":
            c0 = "bottomLeft";
            c1 = "bottomRight";
            direction = "vertical";
            break;
          case "left":
            c0 = "topLeft";
            c1 = "bottomLeft";
            direction = "horizontal";
            break;
          case "right":
            c0 = "topRight";
            c1 = "bottomRight";
            direction = "horizontal";
            break;
          default:
            throw new Error("unknown handle");
        }

        const offsettedCorners = calculateOffsettedCorners(rawSize, corners, element.cornerOffsets);

        const s = p;
        if (direction === "vertical") {
          const y0 = offsettedCorners[c0][1] - corners[c0][1];
          const y1 = offsettedCorners[c1][1] - corners[c1][1];
          while ((p = yield)) {
            const delta = p[1] - s[1];
            element.cornerOffsets[c0][1] = (y0 + delta) / rawSize[1];
            element.cornerOffsets[c1][1] = (y1 + delta) / rawSize[1];
            this.updateSelectedLayout();
            this.redraw();
          }
        } else {
          const x0 = offsettedCorners[c0][0] - corners[c0][0];
          const x1 = offsettedCorners[c1][0] - corners[c1][0];
          while ((p = yield)) {
            const delta = p[0] - s[0];
            element.cornerOffsets[c0][0] = (x0 + delta) / rawSize[0];
            element.cornerOffsets[c1][0] = (x1 + delta) / rawSize[0];
            this.updateSelectedLayout();
            this.redraw();
          }
        }
      }
  
    } catch (e) {
      if (e === 'cancel') {
        this.onRevert();
      } else {
        console.error(e);
      }
    }

    this.onCommit();
  }

  constraintAll(): void {
    const paperSize = this.getPaperSize();
    const layout = calculatePhysicalLayout(
      this.frameTree,
      paperSize,
      [0, 0]
    );
    constraintRecursive(paperSize, layout);
  }

  importImage(layoutlet: Layout, image: HTMLImageElement): void {
    const paperSize = this.getPaperSize();
    // calc expansion to longer size

    layoutlet.element.image = {
      image: image,
      scribble: null,
      n_scale: 1,
      rotation: 0,
      reverse: [1, 1],
      n_translation: [0, 0],
      scaleLock: true,
    };
      
    constraintLeaf(paperSize, layoutlet);
    this.redraw();
  }

  hintIfContains(p: Vector, a: ClickableIcon[]): boolean {
    for (let e of a) {
      if (e.hintIfContains(p, this.hint)) {
        return true;
      }
    }
    return false;
  }

  updateSelectedLayout(): void {
    if (!this.selectedLayout) { return; }
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    this.selectedLayout = findLayoutOf(rootLayout, this.selectedLayout.element);
    if (this.focusedPadding) {
      const handle = this.focusedPadding.handle;
      this.focusedPadding = findPaddingOf(this.selectedLayout, handle);
    }
  }

  updateBorder(border: Border): void {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    const newLayout = findLayoutOf(rootLayout, border.layout.element);
    border.layout = newLayout;
    this.updateBorderTrapezoid(border);
  }

  updateBorderTrapezoid(border: Border): void {
    const corners = makeBorderCorners(border.layout, border.index, BORDER_MARGIN);
    const formalCorners = makeBorderFormalCorners(border.layout, border.index);
    border.corners = corners;
    border.formalCorners = formalCorners;
    this.updateBorderIconPositions(border);
  }

  updateBorderIconPositions(border: Border): void {
    const bt = border.corners;
    this.slantVerticalIcon.position = [bt.topLeft[0],(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5];
    this.expandVerticalIcon.position = [bt.topRight[0],(bt.topRight[1] + bt.bottomRight[1]) * 0.5];
    this.slantHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5,bt.topLeft[1]];
    this.expandHorizontalIcon.position = [(bt.bottomLeft[0] + bt.bottomRight[0]) * 0.5,bt.bottomLeft[1]];
  }

  beforeDoubleClick(p: Vector): boolean {
    for (let e of this.frameIcons) {
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
