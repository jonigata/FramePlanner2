import { Layer, sequentializePointer, type Viewport } from "../system/layeredCanvas";
import { FrameElement, type Layout,type Border, type PaddingHandle, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findPaddingOn, findPaddingOf, makeBorderCorners, makeBorderFormalCorners, calculateOffsettedCorners, Film } from "../dataModels/frameTree";
import { constraintRecursive, constraintLeaf } from "../dataModels/frameTree";
import { translate, scale, rotate } from "../tools/pictureControl";
import { keyDownFlags } from "../system/keyCache";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { extendTrapezoid, isPointInTrapezoid, trapezoidCorners, trapezoidPath } from "../tools/geometry/trapezoid";
import { type Vector, type Rect, box2Rect, add2D, vectorEquals, ensureMinRectSize } from '../tools/geometry/geometry';
import type { PaperRendererLayer } from "./paperRendererLayer";
import type { RectHandle } from "../tools/rectHandle";
import { drawSelectionFrame } from "../tools/draw/selectionFrame";
import type { Trapezoid } from "../tools/geometry/trapezoid";

// TODO: films[0]

const iconUnit: Vector = [32,32];
const BORDER_MARGIN = 10;

export class FrameLayer extends Layer {
  renderLayer: PaperRendererLayer;
  frameTree: FrameElement;
  onFocus: (layout: Layout) => void;
  onCommit: () => void;
  onRevert: () => void;
  onInsert: (element: FrameElement) => void;
  onSplice: (element: FrameElement) => void;
  cursorPosition: Vector;

  splitHorizontalIcon: ClickableIcon;
  splitVerticalIcon: ClickableIcon;
  deleteIcon: ClickableIcon;
  duplicateIcon: ClickableIcon;
  insertIcon: ClickableIcon;
  spliceIcon: ClickableIcon;
  resetPaddingIcon: ClickableIcon;
  zplusIcon: ClickableIcon;
  zminusIcon: ClickableIcon;
  visibilityIcon: ClickableIcon;
  scaleIcon: ClickableIcon;
  rotateIcon: ClickableIcon;
  flipHorizontalIcon: ClickableIcon;
  flipVerticalIcon: ClickableIcon;
  fitIcon: ClickableIcon;
  expandHorizontalIcon: ClickableIcon;
  slantHorizontalIcon: ClickableIcon;
  expandVerticalIcon: ClickableIcon;
  slantVerticalIcon: ClickableIcon;

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
    onFocus: (layout: Layout) => void,
    onCommit: () => void, 
    onRevert: () => void, 
    onInsert: (element: FrameElement) => void, 
    onSplice: (element: FrameElement) => void) {
    super();
    this.renderLayer = renderLayer;
    this.frameTree = frameTree;
    this.onFocus = onFocus;
    this.onCommit = onCommit;
    this.onRevert = onRevert;
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
    this.resetPaddingIcon = new ClickableIcon(["reset-padding.png"],unit,[1,0],"パディングのリセット", isFrameActive, mp);
    this.zplusIcon = new ClickableIcon(["zplus.png"],unit,[0,0],"手前に", isFrameActiveAndVisible, mp);
    this.zminusIcon = new ClickableIcon(["zminus.png"],unit,[0,0],"奥に", isFrameActiveAndVisible, mp);
    this.visibilityIcon = new ClickableIcon(["visibility1.png","visibility2.png","visibility3.png"],unit,[0,0], "不可視/背景と絵/枠線も", isFrameActive, mp);
    this.visibilityIcon.index = 2;

    const isImageActiveDraggable = () => this.interactable && 0 < (this.selectedLayout?.element.filmStack.films.length ?? 0);
    const isImageActive = () => this.interactable && 0 < (this.selectedLayout?.element.filmStack.films.length ?? 0) && !this.pointerHandler;
    this.scaleIcon = new ClickableIcon(["scale.png"],unit,[1,1],"スケール", isImageActiveDraggable, mp);
    this.rotateIcon = new ClickableIcon(["rotate.png"],unit,[1,1],"回転", isImageActiveDraggable, mp);
    this.flipHorizontalIcon = new ClickableIcon(["flip-horizontal.png"],unit,[0,1],"左右反転", isImageActive, mp);
    this.flipVerticalIcon = new ClickableIcon(["flip-vertical.png"],unit,[0,1],"上下反転", isImageActive, mp);
    this.fitIcon = new ClickableIcon(["fit.png"],unit,[0,1],"フィット", isImageActive, mp);

    const isBorderActive = (dir) => this.interactable && this.selectedBorder?.layout.dir === dir;
    this.expandHorizontalIcon = new ClickableIcon(["expand-horizontal.png"],unit,[0.5,1],"幅を変更", () => isBorderActive('h'), mp);
    this.slantHorizontalIcon = new ClickableIcon(["slant-horizontal.png"], unit,[0.5,0],"傾き", () => isBorderActive('h'), mp);
    this.expandVerticalIcon = new ClickableIcon(["expand-vertical.png"],unit,[1,0.5],"幅を変更", () => isBorderActive('v'), mp);
    this.slantVerticalIcon = new ClickableIcon(["slant-vertical.png"], unit,[0,0.5],"傾き", () => isBorderActive('v'), mp);

    this.frameIcons = [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.duplicateIcon, this.insertIcon, this.spliceIcon, this.resetPaddingIcon, this.zplusIcon, this.zminusIcon, this.visibilityIcon, this.scaleIcon, this.rotateIcon, this.flipHorizontalIcon, this.flipVerticalIcon, this.fitIcon];
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

    function fillTrapezoid(corners: Trapezoid, color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      trapezoidPath(ctx, corners);
      ctx.fill();
    }

    function strokeTrapezoid(corners: Trapezoid, color: string, width: number) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      trapezoidPath(ctx, corners);
      ctx.stroke();
    }

    function strokeConnectors(corners0: Trapezoid, corners1: Trapezoid, color: string, width: number) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      for (let position of trapezoidCorners) {
        ctx.beginPath();
        ctx.moveTo(...corners0[position]);
        ctx.lineTo(...corners1[position]);
        ctx.stroke();
      }
    }

    if (this.focusedPadding) {
      fillTrapezoid(this.focusedPadding.corners, "rgba(200,200,0, 0.7)");
    }

    if (this.litBorder) {
      fillTrapezoid(this.litBorder.formalCorners, "rgba(0, 200,200, 0.2)");
      strokeTrapezoid(this.litBorder.corners, "rgba(255, 255, 255, 1)", 6);
      strokeConnectors(this.litBorder.formalCorners, this.litBorder.corners, "rgba(255, 255, 255, 1)", 6);
      strokeTrapezoid(this.litBorder.formalCorners, "rgba(0, 200,200, 0.4)", 3);
      strokeConnectors(this.litBorder.formalCorners, this.litBorder.corners, "rgba(0, 200,200, 0.4)", 3);
    } else if (this.litLayout) {
      if (this.litLayout.element != this.selectedLayout?.element) {
        fillTrapezoid(this.litLayout.formalCorners, "rgba(0, 0, 255, 0.2)");
        strokeTrapezoid(this.litLayout.formalCorners, "rgba(255, 255, 255, 1)", 6);
        strokeTrapezoid(this.litLayout.corners, "rgba(0, 0, 255, 0.4)", 3);
        strokeConnectors(this.litLayout.formalCorners, this.litLayout.corners, "rgba(255, 255, 255, 1)", 6);
        strokeConnectors(this.litLayout.formalCorners, this.litLayout.corners, "rgba(0, 0, 255, 0.4)", 3);
      }
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
      for (let icon of this.frameIcons) {
        if (icon.contains(point)) {
          this.litLayout = this.selectedLayout;
          return;
        }
      }

      const corners = extendTrapezoid(this.selectedLayout.corners, 20, 20);
      if (isPointInTrapezoid(point, corners)) {
        const padding = findPaddingOn(this.selectedLayout, point);
        this.focusedPadding = padding;
        this.litLayout = this.selectedLayout;
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

    const hint = this.decideHint(position);
    if (hint) {
      this.hint(hint.position, hint.message);
    }
  }

  decideHint(position: Vector): { position: Vector, message: string } {
    const hintIfContains = (a: ClickableIcon[]): { position: Vector, message: string } => {
      for (let e of a) {
        if (e.contains(position)) {
          return { position: e.center(), message: e.hint };
        }
      }
      return null;
    }

    if (this.selectedBorder) {
      const hint = hintIfContains(this.borderIcons);
      if (hint) { 
        return hint;
      }
      if (isPointInTrapezoid(position, this.selectedBorder.corners)) {
        return { position, message: "ドラッグで移動" };
      }
      return null;
    } else if (this.selectedLayout) { 
      const origin = this.selectedLayout.origin;
      const size = this.selectedLayout.size;
      const x = origin[0] + size[0] / 2;
      const y = origin[1];
      if (this.focusedPadding) {
        return { position: [x, y-8], message: "ドラッグでパディング変更" };
      }
      if (isPointInTrapezoid(position, this.selectedLayout.corners)) {
        const hint = hintIfContains(this.frameIcons);
        if (hint) {
          return hint;
        }
        if (this.selectedLayout.element.filmStack.films.length !== 0) {
          return { position: [x, y +48], message: "ドラッグで移動" };
        } else if (0 < this.selectedLayout.element.visibility) {
          return { position: [x, y +48], message: "画像をドロップ" };
        } else {
          return null;
        }
      }
    }
    
    return null;
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

    this.updateLit(point);

    if (this.selectedLayout) {
      const q = this.acceptsOnSelectedFrameIcons(point);
      if (q) {
        if (q == "done") {
          return null;
        }
        return q;
      }
    }

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
        if (this.litBorder.layout.element != this.selectedBorder.layout.element ||
            this.litBorder.index != this.selectedBorder.index) {
          return { border: this.litBorder };
        }
      } else { 
        this.selectedBorder = null;
        this.relayoutIcons();
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
          this.onFocus(null);
          this.redraw();
          return null;
        } else {
          return { border: this.litBorder };
        }
      }
    }

    const r = this.acceptsOnFrame(point);
    if (r) {
      if (r == "done") {
        return null;
      }
      return r;
    }

    this.selectedLayout = null;
    this.onFocus(null);
    this.relayoutIcons();
    this.redraw();
    return null;
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

  acceptsOnSelectedFrameIcons(point: Vector): any {
    const layout = this.selectedLayout;
    if (this.splitHorizontalIcon.contains(point)) {
      FrameElement.splitElementHorizontal(
        this.frameTree,
        layout.element
      );
      this.litLayout = null;
      this.selectedLayout = null;
      this.onFocus(null);
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
      this.onFocus(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (this.deleteIcon.contains(point)) {
      FrameElement.eraseElement(this.frameTree, layout.element);
      this.litLayout = null;
      this.selectedLayout = null;
      this.onFocus(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (this.duplicateIcon.contains(point)) {
      FrameElement.duplicateElement(this.frameTree, layout.element);
      this.litLayout = null;
      this.selectedLayout = null;
      this.onFocus(null);
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
    if (this.resetPaddingIcon.contains(point)) {
      this.resetPadding();
      this.onCommit();
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
    if (this.flipHorizontalIcon.contains(point)) {
      layout.element.filmStack.films.forEach(film => {
        film.reverse[0] *= -1;
      });
      this.redraw();
      return "done";
    } 
    if (this.flipVerticalIcon.contains(point)) {
      layout.element.filmStack.films.forEach(film => {
        film.reverse[1] *= -1;
      });
      this.redraw();
      return "done";
    } 
    if (this.fitIcon.contains(point)) {
      constraintLeaf(this.getPaperSize(), layout);
      this.onCommit();
      this.redraw();
      return "done";
    } 
    if (this.scaleIcon.contains(point) || this.rotateIcon.contains(point)) {
      return { layout: layout };
    }
    return null;
  }

  acceptsOnFrame(point: Vector): any {
    let layout = this.litLayout;
    if (!layout) { return null; }

    const paperSize = this.getPaperSize();
    if (keyDownFlags["KeyQ"]) {
      FrameElement.eraseElement(this.frameTree, layout.element);
      this.litLayout = null;
      this.selectedLayout = null;
      this.onFocus(null);
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
      this.onFocus(null);
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
      this.onFocus(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (keyDownFlags["KeyD"]) {
      layout.element.filmStack.films = [];
      this.redraw();
      return "done";
    }
    if (keyDownFlags["KeyT"]) {
      layout.element.filmStack.films.forEach(film => {
        film.reverse[0] *= -1;
      });
      this.redraw();
      return "done";
    }
    if (keyDownFlags["KeyY"]) {
      layout.element.filmStack.films.forEach(film => {
        film.reverse[1] *= -1;
      });
      this.redraw();
      return "done";
    }
    if (keyDownFlags["KeyE"]) {
      constraintLeaf(paperSize, layout);
      this.redraw();
      return "done";
    }
    if (this.selectedLayout?.element != this.litLayout?.element) {
      this.selectedLayout = this.litLayout;
      this.onFocus(this.selectedLayout);
      this.relayoutIcons();
      this.redraw();
      return "done";
    } else {
      return { layout: layout };
    }
  }

  async *pointer(p: Vector, payload: any) {
    if (payload.layout) {
      const layout: Layout = payload.layout;
      const element: FrameElement = layout.element;
      if (0< element.filmStack.films.length) {
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
      this.selectedLayout = null;
      this.onFocus(null);
      this.relayoutIcons();
      this.redraw();
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
    const films = element.getOperationTargetFilms();

    try {
      films.forEach((film, i) => {
        film.matrix = film.makeMatrix(paperSize);
      });

      yield* scale(this.getPaperSize(), p, (q) => {
        const s = Math.max(q[0], q[1]);
        const rootMatrix = new DOMMatrix();
        rootMatrix.scaleSelf(s);

        films.forEach((film, i) => {
          const m = rootMatrix.multiply(film.matrix);
          film.setShiftedTranslation(paperSize, [m.e, m.f]);
          film.setShiftedScale(paperSize, Math.sqrt(m.a * m.a + m.b * m.b));
        });
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
    const films = element.getOperationTargetFilms();

    try {
      films.forEach((film, i) => {
        film.matrix = film.makeMatrix(paperSize);
      });

      yield* rotate(p, (q) => {
        const rotation = Math.max(-180, Math.min(180, -q * 0.2));
        const rootMatrix = new DOMMatrix();
        rootMatrix.rotateSelf(-rotation);

        films.forEach((film, i) => {
          const m = rootMatrix.multiply(film.matrix);
          film.rotation = -Math.atan2(m.b, m.a) * 180 / Math.PI;
          film.setShiftedTranslation(paperSize, [m.e, m.f]);
        });
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(paperSize, layout);
        }
        this.redraw();
      });
      this.onCommit();
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
    }
  }

  *translateImage(p: Vector, layout: Layout) {
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const films = element.getOperationTargetFilms();
    const origins = films.map(film => film.getShiftedTranslation(paperSize));

    try {
      let lastq = null;
      yield* translate(p, (q) => {
        lastq = [...q];
        films.forEach((film, i) => {
          film.setShiftedTranslation(paperSize, [origins[i][0] + q[0], origins[i][1] + q[1]]);
        });
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(paperSize, layout);
        }
        this.redraw();
      });
      if (lastq[0] !== 0 || lastq[1] !== 0) {
        this.onCommit();
      }
    } catch (e) {
      if (e === "cancel") {
        this.onRevert();
      }
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

    const film = new Film();
    film.image = image;
    film.n_scale = 1;
    film.rotation = 0;
    film.reverse = [1, 1];
    film.n_translation = [0, 0];

    layoutlet.element.filmStack.films.push(film);
      
    constraintLeaf(paperSize, layoutlet);
    this.redraw();
  }

  updateSelectedLayout(): void {
    if (!this.selectedLayout) { return; }
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    this.selectedLayout = findLayoutOf(rootLayout, this.selectedLayout.element);
    this.onFocus(this.selectedLayout);

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
    this.relayoutBorderIcons(border);
  }

  relayoutIcons() {
    if (this.selectedLayout) {
      this.relayoutFrameIcons(this.selectedLayout);
      this.redraw();
    }

    if (this.selectedBorder) {
      this.relayoutBorderIcons(this.selectedBorder);
      this.redraw();
    } 
  }

  relayoutFrameIcons(layout: Layout): void {
    const minSize = 200;
    const origin = layout.rawOrigin;
    const size = layout.rawSize;
    const [x, y, w, h] = ensureMinRectSize(minSize, [...origin, ...size]);

    const cp = (ro, ou) => ClickableIcon.calcPosition([x+10, y+10, w-20, h-20],iconUnit, ro, ou);
    this.splitHorizontalIcon.position = cp([0.5,0.5],[1,0]);
    this.splitVerticalIcon.position = cp([0.5,0.5],[0,1]);
    this.deleteIcon.position = cp([1,0],[0,0]);
    this.duplicateIcon.position = cp([1,0],[0,1]);
    this.insertIcon.position = cp([1,0],[0,2]);
    this.spliceIcon.position = cp([1,0],[0,3]);
    this.resetPaddingIcon.position = cp([1,0],[0,4]);
    this.zplusIcon.position = cp([0,0],[2.5,0]);
    this.zminusIcon.position = cp([0,0],[1,0]);
    this.visibilityIcon.position = cp([0,0],[0,0]);
    this.visibilityIcon.index = layout.element.visibility;

    this.scaleIcon.position = cp([1,1],[0,0]);
    this.rotateIcon.position = cp([1,1],[-1,0]);
    this.flipHorizontalIcon.position = cp([0,1], [2,0]);
    this.flipVerticalIcon.position = cp([0,1], [3,0]);
    this.fitIcon.position = cp([0,1], [4,0]);
}

  relayoutBorderIcons(border: Border): void {
    const bt = border.corners;
    this.slantVerticalIcon.position = [bt.topLeft[0],(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5];
    this.expandVerticalIcon.position = [bt.topRight[0],(bt.topRight[1] + bt.bottomRight[1]) * 0.5];
    this.slantHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5,bt.topLeft[1]];
    this.expandHorizontalIcon.position = [(bt.bottomLeft[0] + bt.bottomRight[0]) * 0.5,bt.bottomLeft[1]];
  }

  resetPadding(): void {
    if (!this.selectedLayout) { return; }
    const element = this.selectedLayout.element;
    element.cornerOffsets = {
      topLeft: [0, 0],
      topRight: [0, 0],
      bottomLeft: [0, 0],
      bottomRight: [0, 0],
    }
    this.updateSelectedLayout();
    this.redraw();
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
