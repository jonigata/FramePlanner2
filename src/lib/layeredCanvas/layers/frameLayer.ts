import { type Layer, LayerBase, sequentializePointer, type Picked } from "../system/layeredCanvas";
import { FrameElement, type Layout,type Border, type PaddingHandle, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findPaddingOn, findPaddingOf, makeBorderCorners, makeBorderFormalCorners, calculateOffsettedCorners, listLayoutsAt } from "../dataModels/frameTree";
import { Film, FilmStackTransformer } from "../dataModels/film";
import { type Media, ImageMedia, VideoMedia } from "../dataModels/media";
import { constraintRecursive, constraintLeaf, insertFrameLayers } from "../dataModels/frameTree";
import { translate, scale, rotate } from "../tools/pictureControl";
import { keyDownFlags } from "../system/keyCache";
import { ClickableSlate, ClickableIcon, ClickableSelfRenderer } from "../tools/draw/clickableIcon";
import { pointToQuadrilateralDistance, isPointInTrapezoid, trapezoidCorners, trapezoidPath, trapezoidBoundingRect, trapezoidCenter } from "../tools/geometry/trapezoid";
import { type Vector, type Rect, box2Rect, add2D, scale2D, lerp2D, distance2D, segmentIntersection, isTriangleClockwise, vectorEquals, getRectCenter, rectContains, denormalizePositionInRect } from '../tools/geometry/geometry';
import type { PaperRendererLayer } from "./paperRendererLayer";
import { type RectCornerHandle, rectCornerHandles } from "../tools/rectHandle";
import { drawSelectionFrame, calculateSheetRect, drawSheet } from "../tools/draw/selectionFrame";
import type { Trapezoid } from "../tools/geometry/trapezoid";
import { drawFilmStackBorders } from "../tools/draw/drawFilmStack";
import type { FocusKeeper } from "../tools/focusKeeper";
import { Grid } from "../tools/grid";
import paper from 'paper';
import { PaperOffset } from "paperjs-offset";

const SHEET_Y_MARGIN = 48;

const iconUnit: Vector = [32,32];
const BORDER_MARGIN = 10;
const PADDING_HANDLE_INNER_WIDTH = 20;
const PADDING_HANDLE_OUTER_WIDTH = 20;

export class FrameLayer extends LayerBase {
  cursorPosition: Vector;

  splitHorizontalIcon: ClickableIcon;
  splitVerticalIcon: ClickableIcon;
  deleteIcon: ClickableIcon;
  duplicateIcon: ClickableIcon;
  shiftIcon: ClickableIcon;
  unshiftIcon: ClickableIcon;
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
  insertHorizontalIcon: ClickableIcon;
  expandVerticalIcon: ClickableIcon;
  slantVerticalIcon: ClickableIcon;
  insertVerticalIcon: ClickableIcon;
  swapIcon: ClickableIcon;
  zvalue: ClickableSelfRenderer;

  frameIcons: ClickableSlate[];
  borderIcons: ClickableSlate[];
  litIcons: ClickableSlate[];

  litLayout: Layout | null = null;
  litBorder: Border | null = null;
  selectedLayout: Layout | null = null;
  selectedBorder: Border | null = null;
  focusedPadding: PaddingHandle | null = null;
  pointerHandler: any = null;
  canvasPattern!: CanvasPattern;

  constructor(
    private renderLayer: PaperRendererLayer,
    private focusKeeper: FocusKeeper,
    private frameTree: FrameElement, 
    private onFocus: (layout: Layout | null) => void,
    private onCommit: () => void, 
    private onRevert: () => void, 
    private onShift: (element: FrameElement) => void, 
    private onUnshift: (element: FrameElement) => void,
    private onSwap: (element0: FrameElement, element1: FrameElement) => void,
    private onInsert: (border: Border) => void,
  ) {
    super();

    this.cursorPosition = [-1, -1];

    const unit = iconUnit;
    const spinUnit: Vector = [unit[0], unit[1] * 1 / 6];
    const mp = () => this.paper.matrix;
    const isFrameActiveAndVisible = () => this.interactable && 0 < (this.selectedLayout?.element.visibility ?? 0);
    this.splitHorizontalIcon = new ClickableIcon(["frameLayer/split-horizontal.png"],unit,[0,1],"横に分割", isFrameActiveAndVisible, mp);
    this.splitVerticalIcon = new ClickableIcon(["frameLayer/split-vertical.png"],unit,[0,1],"縦に分割", isFrameActiveAndVisible, mp);
    this.deleteIcon = new ClickableIcon(["frameLayer/delete.png"],unit,[1,0],"削除", isFrameActiveAndVisible, mp);
    this.duplicateIcon = new ClickableIcon(["frameLayer/duplicate.png"],unit,[1,0],"複製", isFrameActiveAndVisible, mp);
    this.shiftIcon = new ClickableIcon(["frameLayer/shift.png"],unit,[1,0],"画像のシフト", isFrameActiveAndVisible, mp);
    this.unshiftIcon = new ClickableIcon(["frameLayer/unshift.png"],unit,[1,0],"画像のアンシフト", isFrameActiveAndVisible, mp);
    this.resetPaddingIcon = new ClickableIcon(["frameLayer/reset-padding.png"],unit,[1,0],"パディングのリセット", isFrameActiveAndVisible, mp);
    this.zplusIcon = new ClickableIcon(["frameLayer/increment.png"],spinUnit,[0,0],"手前に", isFrameActiveAndVisible, mp);
    this.zminusIcon = new ClickableIcon(["frameLayer/decrement.png"],spinUnit,[0,0],"奥に", isFrameActiveAndVisible, mp);
    this.visibilityIcon = new ClickableIcon(["frameLayer/visibility1.png","frameLayer/visibility2.png","frameLayer/visibility3.png"],unit,[0,0], "不可視/背景と絵/枠線も", isFrameActiveAndVisible, mp);
    this.visibilityIcon.index = 2;
    this.zvalue = new ClickableSelfRenderer(
      (ctx: CanvasRenderingContext2D, csr: ClickableSelfRenderer) => {
        const rscale = 1 / this.paper.matrix.a;
        const b = csr.boundingRect;
        const l = this.selectedLayout;
        // const c = getRectCenter(b);
        const c = denormalizePositionInRect([0.45, 0.6], b)
        const fontSize = Math.floor(b[3] * 0.8);
        // ctx.fillStyle = "#222222";
        // ctx.fillRect(b[0], b[1], b[2], b[3]);
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#86C8FF";
        ctx.fillText((l!.element.z + 3).toString(), ...c);
      },
      unit, [0,0], "z値", isFrameActiveAndVisible, mp);

    const isImageActiveDraggable = () => this.interactable && 0 < (this.selectedLayout?.element.filmStack.films.length ?? 0);
    const isImageActive = () => this.interactable && 0 < (this.selectedLayout?.element.filmStack.films.length ?? 0) && !this.pointerHandler;
    this.scaleIcon = new ClickableIcon(["frameLayer/scale.png"],unit,[1,1],"ドラッグでスケール", isImageActiveDraggable, mp);
    this.rotateIcon = new ClickableIcon(["frameLayer/rotate.png"],unit,[1,1],"ドラッグで回転", isImageActiveDraggable, mp);
    this.flipHorizontalIcon = new ClickableIcon(["frameLayer/flip-horizontal.png"],unit,[1,1],"左右反転", isImageActive, mp);
    this.flipVerticalIcon = new ClickableIcon(["frameLayer/flip-vertical.png"],unit,[1,1],"上下反転", isImageActive, mp);
    this.fitIcon = new ClickableIcon(["frameLayer/fit.png"],unit,[1,1],"フィット", isImageActive, mp);

    const isBorderActive = (dir: 'h' | 'v') => this.interactable && this.selectedBorder?.layout.dir === dir;
    this.expandHorizontalIcon = new ClickableIcon(["frameLayer/expand-horizontal.png"],unit,[0.5,1],"幅を変更", () => isBorderActive('h'), mp);
    this.slantHorizontalIcon = new ClickableIcon(["frameLayer/slant-horizontal.png"], unit,[0.5,0],"傾き", () => isBorderActive('h'), mp);
    this.insertHorizontalIcon = new ClickableIcon(["frameLayer/insert-horizontal.png"],unit,[0.5,0],"コマ挿入", () => isBorderActive('h'), mp);
    this.expandVerticalIcon = new ClickableIcon(["frameLayer/expand-vertical.png"],unit,[1,0.5],"幅を変更", () => isBorderActive('v'), mp);
    this.slantVerticalIcon = new ClickableIcon(["frameLayer/slant-vertical.png"], unit,[0,0.5],"傾き", () => isBorderActive('v'), mp);
    this.insertVerticalIcon = new ClickableIcon(["frameLayer/insert-vertical.png"],unit,[0,0.5],"コマ挿入", () => isBorderActive('v'), mp);

    const isSwapVisible = () => this.interactable && this.litLayout != null && this.selectedLayout != null && this.litLayout.element !== this.selectedLayout.element && !this.pointerHandler && 0 < this.litLayout.element.visibility;
    this.swapIcon = new ClickableIcon(["frameLayer/swap.png"],unit,[0.5,0],"選択コマと\n中身を入れ替え", isSwapVisible, mp);

    this.frameIcons = [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.duplicateIcon, this.shiftIcon, this.unshiftIcon, this.resetPaddingIcon, this.zplusIcon, this.zminusIcon, this.visibilityIcon, this.scaleIcon, this.rotateIcon, this.flipHorizontalIcon, this.flipVerticalIcon, this.fitIcon, this.zvalue];
    this.borderIcons = [this.slantVerticalIcon, this.expandVerticalIcon, this.slantHorizontalIcon, this.expandHorizontalIcon, this.insertHorizontalIcon, this.insertVerticalIcon];
    this.litIcons = [this.swapIcon];

    for (let icon of this.frameIcons) {
      if (icon instanceof ClickableIcon) {
        icon.shadowColor = "#448";
      }
    }
    this.zplusIcon.marginBottom = 16;
    this.zminusIcon.marginTop = 16;

    this.makeCanvasPattern();

    focusKeeper.subscribe(this.changeFocus.bind(this));
  }

  calculateRootLayout(): Layout {
    return calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);
  }

  rebuildPageLayouts(matrix: DOMMatrix): void {
    this.relayoutIcons();
  }


  makeCanvasPattern() {
    const pcanvas = document.createElement("canvas");
    pcanvas.width = 16;
    pcanvas.height = 16;
    const pctx = pcanvas.getContext("2d")!;
    pctx.strokeStyle = "rgba(0, 200, 200, 0.4)";
    pctx.lineWidth = 6;
    pctx.beginPath();

    const slope = 1;
    for (let y = -16; y < 32; y += 16) {
      pctx.moveTo(-8, y);
      pctx.lineTo(72, y + 80 * slope);
    }
    pctx.stroke();
    this.canvasPattern = pctx.createPattern(pcanvas, 'repeat')!;
  }

  prerender(): void {
    this.renderLayer.setFrameTree(this.frameTree);
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.interactable) { return; }
    if (depth !== 0) { return; }

    function fillTrapezoid(corners: Trapezoid, color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      trapezoidPath(ctx, corners);
      ctx.fill();
    }

    function strokeTrapezoid(corners: Trapezoid, color: string, width: number) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash([10, 10]);
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
      const corners = this.litBorder.corners;
      const canvasPath = getTrapezoidPath(corners, BORDER_MARGIN, true);

      // 線のスタイルを設定して描画
      ctx.fillStyle = "rgba(0, 200, 200, 0.2)";
      ctx.fill(canvasPath);
    } else if (this.litLayout) {
      if (this.litLayout.element != this.selectedLayout?.element) {
        fillTrapezoid(this.litLayout.corners, "rgba(0, 0, 255, 0.2)");
        strokeTrapezoid(this.litLayout.formalCorners, "rgba(0, 0, 255, 0.4)", 1);
        strokeTrapezoid(this.litLayout.corners, "rgba(192, 192, 255, 1)", 3);
        strokeConnectors(this.litLayout.corners, this.litLayout.formalCorners, "rgba(0, 0, 255, 0.4)", 1);
      }
    }

    if (this.selectedBorder) {
      const corners = this.selectedBorder.corners;
      const canvasPath = getTrapezoidPath(corners, BORDER_MARGIN, true);

      // 線のスタイルを設定して描画
      ctx.fillStyle = this.canvasPattern;
      ctx.fill(canvasPath);
    } else if (this.selectedLayout) {
      const paperSize = this.getPaperSize();
      const [x0, y0, w, h] = trapezoidBoundingRect(this.selectedLayout.corners);
      ctx.save();
      ctx.translate(x0 + w * 0.5, y0 + h * 0.5);
      drawFilmStackBorders(ctx, this.selectedLayout.element.filmStack, paperSize);
      ctx.restore();

      // シート角丸
      if (0 < this.selectedLayout.element.visibility) {
        this.drawSheet(ctx, this.selectedLayout.corners);
      }

      // 選択枠
      if (this.selectedLayout.element.visibility === 0) {
        drawSelectionFrame(ctx, "rgba(0, 128, 255, 1)", this.selectedLayout.corners, 1, 2, false);
      } else {
        drawSelectionFrame(ctx, "rgba(0, 128, 255, 1)", this.selectedLayout.corners);
      }
    }

    this.frameIcons.forEach(icon => icon.render(ctx));
    this.borderIcons.forEach(icon => icon.render(ctx));
    this.litIcons.forEach(icon => icon.render(ctx));
  }

  calculateSheetRect(corners: Trapezoid): Rect {
    return calculateSheetRect(trapezoidBoundingRect(corners), [320, 320], SHEET_Y_MARGIN, 1 / this.paper.matrix.a);
  }

  drawSheet(ctx: CanvasRenderingContext2D, corners: Trapezoid) {
    drawSheet(ctx, corners, this.calculateSheetRect(corners), "rgba(64, 64, 128, 0.7)");
  }

  dropped(position: Vector, media: HTMLCanvasElement | HTMLVideoElement): boolean {
    if (!this.interactable) { return false; }

    let layoutlet: Layout | null = null;

    if (this.selectedLayout) {
      const r = this.calculateSheetRect(this.selectedLayout.corners);
      if (rectContains(r, position)) {
        layoutlet = this.selectedLayout;
      }
    }

    if (!layoutlet) {
      const layout = this.calculateRootLayout();
      layoutlet = findLayoutAt(layout, position, PADDING_HANDLE_OUTER_WIDTH);
      if (!layoutlet) {
        return false;
      }
    }

    if (media instanceof HTMLCanvasElement) {
      this.importMedia(layoutlet.element, new ImageMedia(media));
    }
    if (media instanceof HTMLVideoElement) {
      this.importMedia(layoutlet.element, new VideoMedia(media));
      if (this.selectedLayout?.element === layoutlet.element) {
        this.startVideo(layoutlet);
      }
    }
    this.onFocus(layoutlet);
    this.onCommit();
    return true;
  }

  updateLit(point: Vector): void {
    const layout = this.calculateRootLayout();

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

      if (pointToQuadrilateralDistance(point, this.selectedLayout.corners, false) < PADDING_HANDLE_OUTER_WIDTH) {
        const padding = findPaddingOn(this.selectedLayout, point, PADDING_HANDLE_INNER_WIDTH, PADDING_HANDLE_OUTER_WIDTH);
        this.focusedPadding = padding;
        this.litLayout = this.selectedLayout;
        return;
      }

      const r = this.calculateSheetRect(this.selectedLayout.corners);
      if (rectContains(r, point)) {
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
    if (this.litBorder) {
      return;
    }

    this.litLayout = findLayoutAt(layout, point, PADDING_HANDLE_OUTER_WIDTH);
    if (this.litLayout) {
      this.relayoutLitIcons(this.litLayout);
    }
  }

  pointerHover(position: Vector): boolean {
    this.cursorPosition = position;
    if(!position) {
      this.litLayout = null;
      this.litBorder = null;
      return false;
    }
    if (keyDownFlags["Space"]) { return false; }
    this.updateLit(position);
    this.redraw();

    return this.decideHint(position);
  }

  decideHint(position: Vector): boolean {
    const hintIfContains = (a: ClickableSlate[]): boolean => {
      for (let e of a) {
        if (e.hintIfContains(position, this.hint)) {
          return true;
        }
      }
      return false;
    }

    if (this.litLayout && this.litLayout.element != this.selectedLayout?.element) {
      if (this.swapIcon.hintIfContains(position, this.hint)) {
        return true;
      }

      if (0 < this.litLayout.element.visibility) {
        const r = trapezoidBoundingRect(this.litLayout.corners);
        this.hint(r, "画像をドロップ");
        return true;
      }
    } else if (this.litBorder && this.litBorder.layout.element != this.selectedBorder?.layout.element) {
      if (isPointInTrapezoid(position, this.litBorder.corners)) {
        this.hint([...trapezoidCenter(this.litBorder.corners), 0, 0], "クリックで選択");
        return true;
      }
    } else if (this.selectedBorder) {
      if (hintIfContains(this.borderIcons)) {
        return true;
      }
      if (isPointInTrapezoid(position, this.selectedBorder.corners)) {
        this.hint([...trapezoidCenter(this.selectedBorder.corners), 0, 0], "ドラッグで移動");
        return true;
      }
      return true;
    } else if (this.selectedLayout) { 
      const r = this.calculateSheetRect(this.selectedLayout.corners);
      if (hintIfContains(this.frameIcons)) {
        return true;
      } else if (this.focusedPadding) {
        this.hint(r, "ドラッグでパディング変更");
        return true;
      } else if (rectContains(r, position)) {
        return true;
      }
    }
    return false;
  }

  async keyDown(position: Vector, event: KeyboardEvent): Promise<boolean> {
    if (event.code === "KeyV" && event.ctrlKey) {
      try {
        console.log('クリップボードから画像を貼り付け');
        const items = await navigator.clipboard.read();
        console.log(items);
        
        for (let item of items) {
          for (let type of item.types) {
            console.log(type);
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const url = URL.createObjectURL(blob);
              const image = new Image();
              image.src = url;
              await image.decode();
              URL.revokeObjectURL(url);
              const canvas = document.createElement("canvas");
              canvas.width = image.width;
              canvas.height = image.height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(image, 0, 0);
              this.dropped(position, canvas);
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

  pick(point: Vector): Picked[] {
    const layout = this.calculateRootLayout();
    return listLayoutsAt(layout, point, PADDING_HANDLE_OUTER_WIDTH).map(
      layout => {
        return {
          selected: layout.element === this.selectedLayout?.element,
          action: () => this.selectLayout(layout),
        };
      });
  }

  acceptDepths(): number[] {
    return [0,1];
  }

  accepts(point: Vector, button: number, depth: number): any {
    console.log("frame accepts", depth);
    if (!this.interactable) {return null;}
    if (keyDownFlags["Space"]) {return null;}

    if (depth == 1) {
      const q = this.acceptsForeground(point, button);
      console.log("q1", q);
      return q;
    } else {
      const q = this.acceptsBackground(point, button);
      console.log("q2", q);
      return q;
    }
  }

  acceptsForeground(point: Vector, _button: number): any {
    if (keyDownFlags["KeyT"]) {
      if (this.litBorder) {
        return { action: "transpose-border", border: this.litBorder };
      }
      return null;
    }

    if (this.selectedLayout) {
      const q = this.acceptsOnSelectedFrameIcons(point);
      if (q) {
        return q;
      }

      if (this.selectedLayout.element.visibility === 0) {
        if (pointToQuadrilateralDistance(point, this.selectedLayout.corners, false) < PADDING_HANDLE_OUTER_WIDTH) {
          return { action: "pierce" };
        }
      } else {
        const r = this.calculateSheetRect(this.selectedLayout.corners);

        if (rectContains(r, point)) {
          if (this.focusedPadding) {
            return { action: "move-padding", padding: this.focusedPadding };
          }
          if (this.selectedLayout.element.filmStack.films.length !== 0) {
            if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) {
              return { action: "scale", layout: this.selectedLayout };
            } else if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
              return { action: "rotate", layout: this.selectedLayout };
            } else {
              return { action: "translate", layout: this.selectedLayout };
            }
          } else {
            return { action: "pierce" };
          }
        }

        if (this.litLayout && this.litLayout.element != this.selectedLayout.element) {
          if (this.swapIcon.contains(point)) {
            return { action: "swap", element0: this.selectedLayout.element, element1: this.litLayout.element };
          }
        }
      }
      return null;
    }

    // 選択ボーダー操作
    if (this.selectedBorder) {
      const r = this.acceptsOnSelectedBorder(point);
      if (r) {
        return r;
      }
    }
    return null;
  }

  acceptsOnSelectedBorder(p: Vector): any {
    if (
      keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] ||
      this.expandHorizontalIcon.contains(p) ||this.expandVerticalIcon.contains(p)) {
      return { action: "expand-border" , border: this.selectedBorder };
    } else if (
      keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"] ||
      this.slantHorizontalIcon.contains(p) || this.slantVerticalIcon.contains(p)) {
      return { action: "slant-border" , border: this.selectedBorder};
    } else if (keyDownFlags["KeyT"]) {
      return { action: "transpose-border", border: this.selectedBorder };
    } else if (
      this.insertHorizontalIcon.contains(p) || this.insertVerticalIcon.contains(p)) {
      return { action: "insert", border: this.selectedBorder };
    } else if (pointToQuadrilateralDistance(p, this.selectedBorder!.corners, false) < BORDER_MARGIN) {
      return { action: "move-border" , border: this.selectedBorder };
    }
    return null;
  }

  acceptsOnSelectedFrameIcons(point: Vector): any {
    const layout = this.selectedLayout;
    if (this.splitHorizontalIcon.contains(point)) {
      return { action: "split-horizontal", layout: layout };
    }
    if (this.splitVerticalIcon.contains(point)) {
      return { action: "split-vertical", layout: layout };
    }
    if (this.deleteIcon.contains(point)) {
      return { action: "erase", layout: layout };
    }
    if (this.duplicateIcon.contains(point)) {
      return { action: "duplicate", layout: layout };
    }
    if (this.shiftIcon.contains(point)) {
      return { action: "shift", layout: layout };
    }
    if (this.unshiftIcon.contains(point)) {
      return { action: "unshift", layout: layout };
    }
    if (this.resetPaddingIcon.contains(point)) {
      return { action: "reset-padding", layout: layout };
    }
    if (this.zplusIcon.contains(point)) {
      return { action: "zplus", layout: layout };
    }
    if (this.zminusIcon.contains(point)) {
      return { action: "zminus", layout: layout };
    }
    if (this.visibilityIcon.contains(point)) {
      return { action: "visibility", layout: layout };
    }
    if (this.flipHorizontalIcon.contains(point)) {
      return { action: "flip-horizontal", layout: layout };
    } 
    if (this.flipVerticalIcon.contains(point)) {
      return { action: "flip-vertical", layout: layout };
    } 
    if (this.fitIcon.contains(point)) {
      return { action: "fit", layout: layout };
    } 
    if (this.scaleIcon.contains(point)) {
      return { action: "scale", layout: layout };
    }
    if (this.rotateIcon.contains(point)) {
      return { action: "rotate", layout: layout };
    }
    return null;
  }

  acceptsBackground(point: Vector, _button: number): any {
    const layout = this.calculateRootLayout();

    const border = findBorderAt(layout, point, BORDER_MARGIN);
    if (border) {
      return { action: "select-border", border: border };
    }

    const layoutlet = findLayoutAt(layout, point, PADDING_HANDLE_OUTER_WIDTH, null);
    if (layoutlet) {
      const r = this.acceptsOnFrame(layoutlet);
      if (r) {
        return r;
      }
    }

    this.selectLayout(null);
    this.redraw();
    return null; 
  }

  acceptsOnFrame(layout: Layout): any {
    if (keyDownFlags["KeyQ"]) {
      return { action: "erase", layout: layout };
    }
    if (keyDownFlags["KeyW"]) {
      return { action: "split-horizontal", layout: layout };
    }
    if (keyDownFlags["KeyS"]) {
      return { action: "split-vertical", layout: layout };
    }
    if (keyDownFlags["KeyD"]) {
      return { action: "discard-films", layout: layout };
    }
    if (keyDownFlags["KeyT"]) {
      return { action: "flip-horizontal", layout: layout };
    }
    if (keyDownFlags["KeyY"]) {
      return { action: "flip-vertical", layout: layout };
    }
    if (keyDownFlags["KeyE"]) {
      return { action: "fit", layout: layout };
    }
    return { action: "select", layout: layout };
  }

  changeFocus(layer: Layer | null) {
    if (layer != this) {
      if (this.selectedLayout || this.selectedBorder) {
        this.stopVideo(this.selectedLayout);
        this.selectedBorder = null;
        this.doSelectLayout(null);
      }
    }
  }

  async *pointer(p: Vector, payload: any) {
    switch (payload.action) {
      case "transpose-border":
        this.transposeBorder(this.litBorder!);
        break;
      case "swap":
        this.swapContent(payload.element0, payload.element1);
        break;
  
      case "move-padding":
        yield* this.expandPadding(p, payload.padding);
        break;
      case "reset-padding":
        this.resetPadding();
        this.onCommit();
        this.redraw();
        return "done";

      case "select-border":
        this.selectLayout(null);
        this.selectedBorder = payload.border;
        this.relayoutBorderIcons(payload.border);
        this.redraw();
        break;
      case "expand-border":
        yield* this.expandBorder(p, payload.border);
        break;
      case "slant-border":
        yield* this.slantBorder(p, payload.border);
        break;
      case "move-border":
        yield* this.moveBorder(p, payload.border);
        break;

      case "select":
        this.selectedBorder = null;
        this.selectLayout(payload.layout);
        this.relayoutIcons();
        this.redraw();
        break;
      case "split-horizontal":
        FrameElement.splitElementHorizontal(
          this.frameTree,
          payload.layout.element
        );
        this.litLayout = null;
        this.selectLayout(null);
        this.onCommit();
        this.redraw();
        break;
      case "split-vertical":
        FrameElement.splitElementVertical(
          this.frameTree,
          payload.layout.element
        );
        this.litLayout = null;
        this.selectLayout(null);
        this.onCommit();
        this.redraw();
        break;
      case "erase":
        FrameElement.eraseElement(this.frameTree, payload.layout.element);
        this.litLayout = null;
        this.selectLayout(null);
        this.onCommit();
        this.redraw();
        break;
      case "duplicate":
        FrameElement.duplicateElement(this.frameTree, payload.layout.element);
        this.litLayout = null;
        this.selectLayout(null);
        this.onCommit();
        this.redraw();
        break;
      case "shift":
        this.onShift(payload.layout.element);
        this.redraw();
        break;
      case "unshift":
        this.onUnshift(payload.layout.element);
        this.redraw();
        break;
      case "insert":
        this.onInsert(this.selectedBorder!);
        this.selectedBorder = null;
        break;

      case "zplus":
        payload.layout.element.z += 1;
        this.onCommit();
        this.redraw();
        break;
      case "zminus":
        payload.layout.element.z -= 1;
        this.onCommit();
        this.redraw();
        break;
      case "visibility":
        this.visibilityIcon.increment();
        payload.layout.element.visibility = this.visibilityIcon.index;
        this.onCommit();
        this.redraw();
        break;

      case "flip-horizontal":
        payload.layout.element.filmStack.films.forEach((film: Film) => {
          film.reverse[0] *= -1;
        });
        this.redraw();
        break;
      case "flip-vertical":
        payload.layout.element.filmStack.films.forEach((film: Film) => {
          film.reverse[1] *= -1;
        });
        this.redraw();
        break;
      case "fit":
        const paperSize = this.getPaperSize();
        const transformer = new FilmStackTransformer(paperSize, payload.layout.element.filmStack.films);
        transformer.scale(0.01);
        constraintLeaf(paperSize, payload.layout);
        this.onCommit();
        this.redraw();
        break;
      case "discard-films":
        payload.layout.element.filmStack.films = [];
        this.redraw();
        break;

      case "scale":
        yield* this.scaleImage(p, payload.layout);
        break;
      case "rotate":
        yield* this.rotateImage(p, payload.layout);
        break;
      case "translate":
        yield* this.translateImage(p, payload.layout);
        break;

      case "ignore":
        break;
      case "pierce":
        this.pierce();
        break;

      default:
        console.error("unknown action", payload.action);
    }
  }

  *scaleImage(p: Vector, layout: Layout) {
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const films = element.filmStack.getOperationTargetFilms();

    try {
      const transformer = new FilmStackTransformer(paperSize, films);

      yield* scale(this.getPaperSize(), p, (q: Vector) => {
        transformer.scale(Math.max(q[0], q[1]))
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

  *rotateImage(p: Vector, layout: Layout) {
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const films = element.filmStack.getOperationTargetFilms();

    try {
      const transformer = new FilmStackTransformer(paperSize, films);

      yield* rotate(p, (q: number) => {
        transformer.rotate(q*-0.2);
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
    // クリック判定と兼用
    const startingTime = performance.now();

    const paperSize = this.getPaperSize();
    const element = layout.element;
    const films = element.filmStack.getOperationTargetFilms();
    const origins = films.map(film => film.getShiftedTranslation(paperSize));

    try {
      let lastq = null;
      yield* translate(p, (q: Vector) => {
        lastq = [...q];
        films.forEach((film, i) => {
          film.setShiftedTranslation(paperSize, [origins[i][0] + q[0], origins[i][1] + q[1]]);
        });
        if (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"]) {
          constraintLeaf(paperSize, layout);
        }
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

  *moveBorder(p: Vector, border: Border) {
    const layout = border.layout;
    const index = border.index;

    let i0 = index - 1;
    let i1 = index;
    if (layout.dir === "h") {[i0, i1] = [i1, i0];}

    const child0 = layout.children![i0];
    const child1 = layout.children![i1];

    const c0 = child0.element;
    const c1 = child1.element;
    const rawSpacing = layout.children![index-1].element.divider.spacing; // dont use i0
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
    const prev = border.layout.children![border.index-1].element;
    const curr = border.layout.children![border.index].element;
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
    const prev = border.layout.children![border.index-1].element;
    const rawSlant = prev.divider.slant;

    const s = p;
    try {
      while ((p = yield)) {
        const op = p[dir] - s[dir];
        let newSlant = rawSlant + op * 0.2;
        if (keyDownFlags["AltLeft"] || keyDownFlags["AltRight"]) {
          newSlant = Math.round(newSlant / 15) * 15;
        }
        prev.divider.slant = Math.max(-42, Math.min(42, newSlant));
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

    try {
      if ((rectCornerHandles as string[]).indexOf(handle) !== -1) {
        // padding.handleが角の場合
        const cornerHandle = handle as RectCornerHandle;
        const q = element.cornerOffsets[cornerHandle];
        const s = p;
        while ((p = yield)) {
          const delta = [p[0] - s[0], p[1] - s[1]];
          (element.cornerOffsets as any)[handle] = [q[0] + delta[0] / rawSize[0], q[1] + delta[1] / rawSize[1]];
          this.updateSelectedLayout();
          this.redraw();
        }
      } else {
        // padding.handleが辺の場合
        let c0: RectCornerHandle, c1: RectCornerHandle;
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
    const layout = this.calculateRootLayout();
    constraintRecursive(paperSize, layout);
  }

  importMedia(element: FrameElement, media: Media): void {
    const paperSize = this.getPaperSize();
    const film = new Film(media);
    insertFrameLayers(this.frameTree, paperSize, element, element.filmStack.films.length, [film]);

    this.onCommit();
    this.redraw();
  }

  updateSelectedLayout(): void {
    if (!this.selectedLayout) { return; }
    const rootLayout = this.calculateRootLayout();
    this.selectLayout(findLayoutOf(rootLayout, this.selectedLayout.element));

    if (this.focusedPadding) {
      const handle = this.focusedPadding.handle;
      this.focusedPadding = findPaddingOf(this.selectedLayout, handle, PADDING_HANDLE_INNER_WIDTH, PADDING_HANDLE_OUTER_WIDTH);
    }
  }

  updateBorder(border: Border): void {
    const rootLayout = this.calculateRootLayout();
    const newLayout = findLayoutOf(rootLayout, border.layout.element)!;
    border.layout = newLayout;
    this.updateBorderTrapezoid(border);
  }

  updateBorderTrapezoid(border: Border): void {
    const corners = makeBorderCorners(border.layout, border.index, 0);
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
    const grid = this.makeGrid(layout);
    const cp = grid.calcPosition.bind(grid);

    this.visibilityIcon.position = cp([0,0],[0,0]);
    this.visibilityIcon.index = layout.element.visibility;
    this.zplusIcon.position = cp([0,0],[1,-0.05]);
    this.zminusIcon.position = cp([0,0],[1,0.9]);
    this.zvalue.position = cp([0,0],[1.025,-0.075]);

    this.deleteIcon.position = cp([1,0],[0,0]);
    this.duplicateIcon.position = cp([1,0],[-1,0]);
    this.shiftIcon.position = cp([1,0],[-2,0]);
    this.unshiftIcon.position = cp([1,0],[-3,0]);
    this.resetPaddingIcon.position = cp([1,0],[-4,0]);

    this.splitHorizontalIcon.position = cp([0,1],[0,0]);
    this.splitVerticalIcon.position = cp([0,1],[1,0]);

    this.flipHorizontalIcon.position = cp([1,1], [-4.5,0]);
    this.flipVerticalIcon.position = cp([1,1], [-3.5,0]);
    this.fitIcon.position = cp([1,1], [-2.5,0]);

    this.scaleIcon.position = cp([1,1],[0,0]);
    this.rotateIcon.position = cp([1,1],[-1,0]);
  }

  makeGrid(layout: Layout) {
    const rscale = 1 / this.paper.matrix.a;
    const unit: Vector = scale2D([...iconUnit], rscale);
    const grid = new Grid(this.calculateSheetRect(layout.corners), -10, unit)
    return grid;
  }

  relayoutBorderIcons(border: Border): void {
    const bt = border.corners;
    this.slantVerticalIcon.position = [bt.topLeft[0],(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5];
    this.expandVerticalIcon.position = [(bt.topRight[0] + bt.topRight[0]) * 0.5, (bt.topRight[1] + bt.bottomRight[1]) * 0.5];
    this.insertVerticalIcon.position = [bt.topLeft[0]-40,(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5];
    this.slantHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5,bt.topLeft[1]];
    this.expandHorizontalIcon.position = [(bt.bottomLeft[0] + bt.bottomRight[0]) * 0.5, (bt.bottomLeft[1] + bt.bottomRight[1]) * 0.5];
    this.insertHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5,bt.topLeft[1]-40];
  }

  relayoutLitIcons(layout: Layout): void {
    const center = lerp2D(layout.corners.topLeft, layout.corners.topRight, 0.5);
    getRectCenter([...layout.origin, ...layout.size]);
    this.swapIcon.position = center;    
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

  swapContent(a: FrameElement, b: FrameElement): void {
    console.log("swap", a, b);
    this.onSwap(a, b);
    this.onCommit();
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
    for (let e of this.litIcons) {
      if (e.contains(p)) {
        return true;
      }
    }
    return false;
  }

  // 基本的には直接呼び出さない
  // changeFocusとselectLayoutからのみ
  videoRedrawInterval: ReturnType<typeof setTimeout> | undefined;
  doSelectLayout(layout: Layout | null): void {
    if (layout?.element !== this.selectedLayout?.element) {
      this.stopVideo(this.selectedLayout);
      this.startVideo(layout);
    }

    this.selectedLayout = layout;
    this.relayoutIcons();
    this.onFocus(layout);
  }

  stopVideo(layout: Layout | null) {
    clearInterval(this.videoRedrawInterval);
    this.videoRedrawInterval = undefined;      
    if (layout) {
      for (const film of layout.element.filmStack.films) {
        if (film.media instanceof VideoMedia) {
          film.media.video.pause();
        }
      }
    }
  }

  startVideo(layout: Layout | null) {
    if (!layout) { return; }

    let playFlag = false;
    for (const film of layout.element.filmStack.films) {
      if (film.media instanceof VideoMedia) {
        playFlag = true;
        film.media.video.play();
      }
    }
    if (playFlag) {
      this.videoRedrawInterval = setInterval(() => {
        this.redraw();
      }, 1000/24);
    }
  }

  selectLayout(layout: Layout | null): void {
    this.doSelectLayout(layout);
    this.focusKeeper.setFocus(layout == null ? null : this);
  }

  drawFilmBorders(ctx: CanvasRenderingContext2D, layout: Layout) {
    const paperSize = this.getPaperSize();
    const element = layout.element;

    const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
    ctx.save();
    ctx.translate(x0 + w * 0.5, y0 + h * 0.5);
    drawFilmStackBorders(ctx, element.filmStack, paperSize);
    ctx.restore();
  }

  transposeBorder(border: Border): void {
    const target = border.layout.element.children[border.index-1];
    FrameElement.transposeDivider(this.frameTree, target);
    this.onCommit();
    this.litLayout = null;
    this.selectedBorder = null;
    this.litBorder = null;
    this.selectLayout(null);
    this.redraw();
  }

  renderDepths(): number[] { return [0]; }

  get interactable(): boolean { return this.mode == null; }
}
sequentializePointer(FrameLayer);

// paper.jsをvitest環境で読み込むとエラーが出るようなので
// trapezoid.tsに置けない
// https://github.com/paperjs/paper.js/issues/1805
export function getTrapezoidPath(t: Trapezoid, margin: number, ignoresInverted: boolean): Path2D {
  const [A, B, C, D] = [[...t.topLeft] as Vector, [...t.topRight] as Vector, [...t.bottomRight] as Vector, [...t.bottomLeft] as Vector];

  // PaperOffset.offsetが縮退ポリゴンを正しく扱えていないため、小細工
  let flag = true;
  while (flag) {
    flag = false;
    if (distance2D(A, B) < 0.05) {
      B[0] += 0.1;
      flag = true;
    }
    if (distance2D(B, C) < 0.05) {
      C[1] += 0.1;
      flag = true;
    }
    if (distance2D(C, D) < 0.05) {
      D[0] -= 0.1;
      flag = true;
    }
    if (distance2D(D, A) < 0.05) {
      A[1] -= 0.1;
      flag = true;
    }
  }

  const path = new paper.Path();
  const join = "round";

  function addTriangle(a: Vector, b: Vector, c: Vector) {
    if (!ignoresInverted || isTriangleClockwise([a, b, c])) {
      path.add(a, b, c);
      path.closed = true;
      return 1;
    }
    return 0;
  }

  // A C
  // |X|
  // D B
  const q = segmentIntersection([A, B], [C, D]);
  if (q) {
    let n = 0;
    n += addTriangle(A, q, D);
    n += addTriangle(C, q, B);
    if (n == 0) { return new Path2D(); }
    return new Path2D(PaperOffset.offset(path, margin, { join }).pathData);
  }

  // A-B
  //  X
  // C-D
  const q2 = segmentIntersection([A, D], [B, C]);
  if (q2) {
    let n = 0;
    n += addTriangle(A, B, q2);
    n += addTriangle(q2, C, D);
    if (n == 0) { return new Path2D(); }
    return new Path2D(PaperOffset.offset(path, margin, { join }).pathData);
  }

  // A-B
  // | |
  // D-C
  if (ignoresInverted || isTriangleClockwise([A, B, C])) {
    path.add(A, B, C, D);
    path.closed = true;
    try {
      return new Path2D(PaperOffset.offset(path, margin, { join }).pathData);
    }
    catch (e) {
      console.error(e);
      console.log(A, B, C, D, margin, ignoresInverted);
    }
  }

  return new Path2D();
}
