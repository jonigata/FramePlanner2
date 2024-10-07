import { Layer, sequentializePointer, type Picked } from "../system/layeredCanvas";
import { FrameElement, type Layout,type Border, type PaddingHandle, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findPaddingOn, findPaddingOf, makeBorderCorners, makeBorderFormalCorners, calculateOffsettedCorners } from "../dataModels/frameTree";
import { Film, FilmStackTransformer } from "../dataModels/film";
import { Media, ImageMedia, VideoMedia } from "../dataModels/media";
import { constraintRecursive, constraintLeaf } from "../dataModels/frameTree";
import { translate, scale, rotate } from "../tools/pictureControl";
import { keyDownFlags } from "../system/keyCache";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { pointToQuadrilateralDistance, isPointInTrapezoid, trapezoidCorners, trapezoidPath, trapezoidBoundingRect, trapezoidCenter, getTrapezoidPath } from "../tools/geometry/trapezoid";
import { type Vector, type Rect, box2Rect, add2D, vectorEquals, ensureMinRectSize, getRectCenter, extendRect } from '../tools/geometry/geometry';
import type { PaperRendererLayer } from "./paperRendererLayer";
import type { RectHandle } from "../tools/rectHandle";
import { drawSelectionFrame } from "../tools/draw/selectionFrame";
import type { Trapezoid } from "../tools/geometry/trapezoid";
import { drawFilmStackBorders } from "../tools/draw/drawFilmStack";
import type { FocusKeeper } from "../tools/focusKeeper";
import * as paper from 'paper';

const iconUnit: Vector = [32,32];
const BORDER_MARGIN = 10;
const PADDING_HANDLE_INNER_WIDTH = 20;
const PADDING_HANDLE_OUTER_WIDTH = 20;
const SHEET_TOP_MARGIN = 48;
const SHEET_MARGIN = 16;

export class FrameLayer extends Layer {
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

  frameIcons: ClickableIcon[];
  borderIcons: ClickableIcon[];
  litIcons: ClickableIcon[];

  litLayout: Layout;
  litBorder: Border;
  selectedLayout: Layout;
  selectedBorder: Border;
  focusedPadding: PaddingHandle;
  pointerHandler: any;
  canvasPattern: CanvasPattern;

  constructor(
    private renderLayer: PaperRendererLayer,
    private focusKeeper: FocusKeeper,
    private frameTree: FrameElement, 
    private onFocus: (layout: Layout) => void,
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
    const mp = () => this.paper.matrix;
    const isFrameActive = () => this.interactable && this.selectedLayout && !this.pointerHandler;
    const isFrameActiveAndVisible = () => this.interactable && 0 < this.selectedLayout?.element.visibility && !this.pointerHandler;
    this.splitHorizontalIcon = new ClickableIcon(["frameLayer/split-horizontal.png"],unit,[0,1],"横に分割", isFrameActiveAndVisible, mp);
    this.splitVerticalIcon = new ClickableIcon(["frameLayer/split-vertical.png"],unit,[0,1],"縦に分割", isFrameActiveAndVisible, mp);
    this.deleteIcon = new ClickableIcon(["frameLayer/delete.png"],unit,[1,0],"削除", isFrameActive, mp);
    this.duplicateIcon = new ClickableIcon(["frameLayer/duplicate.png"],unit,[1,0],"複製", isFrameActive, mp);
    this.shiftIcon = new ClickableIcon(["frameLayer/shift.png"],unit,[1,0],"画像のシフト", isFrameActive, mp);
    this.unshiftIcon = new ClickableIcon(["frameLayer/unshift.png"],unit,[1,0],"画像のアンシフト", isFrameActive, mp);
    this.resetPaddingIcon = new ClickableIcon(["frameLayer/reset-padding.png"],unit,[1,0],"パディングのリセット", isFrameActive, mp);
    this.zplusIcon = new ClickableIcon(["frameLayer/zplus.png"],unit,[0,0],"手前に", isFrameActiveAndVisible, mp);
    this.zminusIcon = new ClickableIcon(["frameLayer/zminus.png"],unit,[0,0],"奥に", isFrameActiveAndVisible, mp);
    this.visibilityIcon = new ClickableIcon(["frameLayer/visibility1.png","frameLayer/visibility2.png","frameLayer/visibility3.png"],unit,[0,0], "不可視/背景と絵/枠線も", isFrameActive, mp);
    this.visibilityIcon.index = 2;

    const isImageActiveDraggable = () => this.interactable && 0 < (this.selectedLayout?.element.filmStack.films.length ?? 0);
    const isImageActive = () => this.interactable && 0 < (this.selectedLayout?.element.filmStack.films.length ?? 0) && !this.pointerHandler;
    this.scaleIcon = new ClickableIcon(["frameLayer/scale.png"],unit,[1,1],"スケール", isImageActiveDraggable, mp);
    this.rotateIcon = new ClickableIcon(["frameLayer/rotate.png"],unit,[1,1],"回転", isImageActiveDraggable, mp);
    this.flipHorizontalIcon = new ClickableIcon(["frameLayer/flip-horizontal.png"],unit,[0,1],"左右反転", isImageActive, mp);
    this.flipVerticalIcon = new ClickableIcon(["frameLayer/flip-vertical.png"],unit,[0,1],"上下反転", isImageActive, mp);
    this.fitIcon = new ClickableIcon(["frameLayer/fit.png"],unit,[0,1],"フィット", isImageActive, mp);

    const isBorderActive = (dir) => this.interactable && this.selectedBorder?.layout.dir === dir;
    this.expandHorizontalIcon = new ClickableIcon(["frameLayer/expand-horizontal.png"],unit,[0.5,1],"幅を変更", () => isBorderActive('h'), mp);
    this.slantHorizontalIcon = new ClickableIcon(["frameLayer/slant-horizontal.png"], unit,[0.5,0],"傾き", () => isBorderActive('h'), mp);
    this.insertHorizontalIcon = new ClickableIcon(["frameLayer/insert-horizontal.png"],unit,[0.5,0],"コマ挿入", () => isBorderActive('h'), mp);
    this.expandVerticalIcon = new ClickableIcon(["frameLayer/expand-vertical.png"],unit,[1,0.5],"幅を変更", () => isBorderActive('v'), mp);
    this.slantVerticalIcon = new ClickableIcon(["frameLayer/slant-vertical.png"], unit,[0,0.5],"傾き", () => isBorderActive('v'), mp);
    this.insertVerticalIcon = new ClickableIcon(["frameLayer/insert-vertical.png"],unit,[0,0.5],"コマ挿入", () => isBorderActive('v'), mp);

    const isFrameLit = () => this.interactable && this.litLayout && this.selectedLayout && this.litLayout.element !== this.selectedLayout.element && !this.pointerHandler;
    this.swapIcon = new ClickableIcon(["frameLayer/swap.png"],unit,[0.5,0.5],"選択コマと\n中身を入れ替え", isFrameLit, mp);

    this.frameIcons = [this.splitHorizontalIcon, this.splitVerticalIcon, this.deleteIcon, this.duplicateIcon, this.shiftIcon, this.unshiftIcon, this.resetPaddingIcon, this.zplusIcon, this.zminusIcon, this.visibilityIcon, this.scaleIcon, this.rotateIcon, this.flipHorizontalIcon, this.flipVerticalIcon, this.fitIcon];
    this.borderIcons = [this.slantVerticalIcon, this.expandVerticalIcon, this.slantHorizontalIcon, this.expandHorizontalIcon, this.insertHorizontalIcon, this.insertVerticalIcon];
    this.litIcons = [this.swapIcon];

    for (let icon of this.frameIcons) {
      icon.shadowColor = "#222";
    }

    this.makeCanvasPattern();

    focusKeeper.subscribe(this.changeFocus.bind(this));
  }

  calculateLayout(matrix: DOMMatrix): void {
    this.relayoutIcons();
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
      console.log("litBorder", corners);
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
      console.log("litBorder", corners);
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
      this.drawSheet(ctx, this.selectedLayout.corners);

      // 選択枠
      drawSelectionFrame(ctx, "rgba(0, 128, 255, 1)", this.selectedLayout.corners);
    }

    this.frameIcons.forEach(icon => icon.render(ctx));
    this.borderIcons.forEach(icon => icon.render(ctx));
    this.litIcons.forEach(icon => icon.render(ctx));
  }

  calculateSheetRect(corners: Trapezoid): Rect {
    const rscale = 1 / this.paper.matrix.a;
    const r = extendRect(trapezoidBoundingRect(corners), SHEET_MARGIN * rscale);
    r[1] -= SHEET_TOP_MARGIN * rscale;
    r[3] += SHEET_TOP_MARGIN * rscale * 2;
    const minSize = 320 * rscale;
    return ensureMinRectSize(minSize, r);
  }

  drawSheet(ctx: CanvasRenderingContext2D, corners: Trapezoid) {
    const r = this.calculateSheetRect(corners);
    const paperr = new paper.Rectangle(...r);
    const path1 = new paper.Path.Rectangle(paperr, [8, 8]);

    const path2 = new paper.Path();
    const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) {
        path2.moveTo(p as Vector);
      } else {
        path2.lineTo(p as Vector);
      }
    }
    path2.closed = true;

    const path3 = path1.subtract(path2);
    
    ctx.fillStyle = "rgba(64, 64, 128, 0.7)";
    ctx.fill(new Path2D(path3.pathData));
  }

  dropped(position: Vector, media: HTMLCanvasElement | HTMLVideoElement) {
    if (!this.interactable) { return; }

    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getPaperSize(),
      [0, 0]
    );
    let layoutlet = findLayoutAt(layout, position, PADDING_HANDLE_OUTER_WIDTH);
    if (!layoutlet) {
      return false;
    }

    if (media instanceof HTMLCanvasElement) {
      this.importMedia(layoutlet, new ImageMedia(media));
      layoutlet.element.gallery.push(media)
    }
    if (media instanceof HTMLVideoElement) {
      this.importMedia(layoutlet, new VideoMedia(media));
    }
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

      if (pointToQuadrilateralDistance(point, this.selectedLayout.corners, true) < PADDING_HANDLE_OUTER_WIDTH) {
        const padding = findPaddingOn(this.selectedLayout, point, PADDING_HANDLE_INNER_WIDTH, PADDING_HANDLE_OUTER_WIDTH);
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

    this.litBorder = findBorderAt(layout, point, BORDER_MARGIN, true);
    if (this.litBorder) {
      console.log("find litBorder");
      return;
    }
    console.log("dont find litBorder");

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
    if (keyDownFlags["Space"]) { return; }
    this.updateLit(position);
    this.redraw();

    this.decideHint(position);
  }

  decideHint(position: Vector): void {
    const hintIfContains = (a: ClickableIcon[]): boolean => {
      for (let e of a) {
        if (e.hintIfContains(position, this.hint)) {
          return true;
        }
      }
      return false;
    }

    if (this.litLayout && this.litLayout.element != this.selectedLayout?.element) {
      if (this.swapIcon.hintIfContains(position, this.hint)) {
        return;
      }

      const origin = this.litLayout.origin;
      const size = this.litLayout.size;
      const r: Rect = [...origin, ...size];
      this.hint(r, "画像をドロップ");
    } else if (this.litBorder && this.litBorder.layout.element != this.selectedBorder?.layout.element) {
      if (isPointInTrapezoid(position, this.litBorder.corners)) {
        this.hint([...trapezoidCenter(this.litBorder.corners), 0, 0], "クリックで選択");
      }
    } else if (this.selectedBorder) {
      if (hintIfContains(this.borderIcons)) {
        return;
      }
      if (isPointInTrapezoid(position, this.selectedBorder.corners)) {
        this.hint([...trapezoidCenter(this.selectedBorder.corners), 0, 0], "ドラッグで移動");
      }
      return;
    } else if (this.selectedLayout) { 
      const origin = this.selectedLayout.origin;
      const size = this.selectedLayout.size;
      const r: Rect = [...origin, ...size];
      if (this.focusedPadding) {
        this.hint(r, "ドラッグでパディング変更");
      } else if (isPointInTrapezoid(position, this.selectedLayout.corners)) {
        if (hintIfContains(this.frameIcons)) {
          return;
        }
        if (this.selectedLayout.element.filmStack.films.length !== 0) {
          this.hint(r, "ドラッグで変更");
        } else if (0 < this.selectedLayout.element.visibility) {
          this.hint(r, "画像をドロップ");
        }
      } else {
        hintIfContains(this.litIcons);
      }
    }
  }

  async keyDown(position: Vector, event: KeyboardEvent): Promise<boolean> {
    if (event.code === "KeyV" && event.ctrlKey) {
      try {
        console.log('クリップボードから画像を貼り付け');
        const items = await navigator.clipboard.read();
  
        for (let item of items) {
          for (let type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const url = URL.createObjectURL(blob);
              const image = new Image();
              image.src = url;
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = image.width;
              canvas.height = image.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(image, 0, 0);
              this.dropped(this.cursorPosition, canvas);
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

  pick(point: Vector): Picked {
    console.log("pick:A");
    if (this.selectedLayout) {
      console.log("pick:B");
      if (pointToQuadrilateralDistance(point, this.selectedLayout.corners, true) < PADDING_HANDLE_OUTER_WIDTH) {
        console.log("pick:C");
        return { layer: this, payload: this.selectedLayout };
      }
    }
    return null;
  }

  acceptDepths(): number[] {
    return [0,1];
  }

  accepts(point: Vector, button: number, depth: number, picked: Picked): any {
    if (!this.interactable) {return null;}
    if (keyDownFlags["Space"]) {return null;}

    console.log("frame accepts", picked);
    if (depth == 1) {
      return this.acceptsForeground(point, button, picked);
    } else {
      return this.acceptsBackground(point, button, picked);
    }
  }

  acceptsForeground(point: Vector, _button: number, picked: Picked): any {
    if (keyDownFlags["KeyT"]) {
      if (this.litBorder) {
        this.transposeBorder(this.litBorder);
      }
      return null;
    }

    if (this.selectedLayout) {
      const q = this.acceptsOnSelectedFrameIcons(point);
      if (q) {
        if (q == "done") {
          return null;
        }
        return q;
      }

      if (this.litLayout && this.litLayout.element != this.selectedLayout.element) {
        if (this.swapIcon.contains(point)) {
          this.swapContent(this.selectedLayout.element, this.litLayout.element);
          return null;
        }
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
        if (r == "done") {
          return null;
        }
        return r;
      }
      this.selectedBorder = null;
      this.relayoutIcons();
      this.redraw();
      return null;
    }
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
    } else if (keyDownFlags["KeyT"]) {
      this.transposeBorder(this.selectedBorder);
      return "done";
    } else if (
      this.insertHorizontalIcon.contains(p) || this.insertVerticalIcon.contains(p)) {
      this.onInsert(this.selectedBorder);
      this.selectedBorder = null;
      return "done";
    } else if (pointToQuadrilateralDistance(p, this.selectedBorder.corners, true) < BORDER_MARGIN) {
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
      this.selectLayout(null);
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
      this.selectLayout(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (this.deleteIcon.contains(point)) {
      FrameElement.eraseElement(this.frameTree, layout.element);
      this.litLayout = null;
      this.selectLayout(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (this.duplicateIcon.contains(point)) {
      FrameElement.duplicateElement(this.frameTree, layout.element);
      this.litLayout = null;
      this.selectLayout(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (this.shiftIcon.contains(point)) {
      this.onShift(layout.element);
      this.redraw();
      return "done";
    }
    if (this.unshiftIcon.contains(point)) {
      this.onUnshift(layout.element);
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
      const paperSize = this.getPaperSize();
      const transformer = new FilmStackTransformer(paperSize, layout.element.filmStack.films);
      transformer.scale(0.01);
      constraintLeaf(paperSize, layout);
      this.onCommit();
      this.redraw();
      return "done";
    } 
    if (this.scaleIcon.contains(point) || this.rotateIcon.contains(point)) {
      return { layout: layout };
    }
    return null;
  }

  acceptsBackground(point: Vector, _button: number, picked: Picked): any {
    const layout = calculatePhysicalLayout(this.frameTree, this.getPaperSize(), [0, 0]);

    const border = findBorderAt(layout, point, BORDER_MARGIN, true);
    if (border) {
      this.selectLayout(null);
      this.selectedBorder = border;
      this.relayoutBorderIcons(border);
      this.redraw();
      return null;
    }

    console.log("acceptsBackground", picked, picked?.layer === this);

    const current = picked?.layer === this ? picked.payload : null;
    console.log(current);
    const layoutlet = findLayoutAt(layout, point, PADDING_HANDLE_OUTER_WIDTH, current);
    if (layoutlet) {
      const r = this.acceptsOnFrame(layoutlet);
      if (r) {
        if (r == "done") {
          return null;
        }
        return r;
      }
    }
    
    this.selectLayout(null);
    this.redraw();
    return null; 
  }

  acceptsOnFrame(layout: Layout): any {
    const paperSize = this.getPaperSize();
    if (keyDownFlags["KeyQ"]) {
      FrameElement.eraseElement(this.frameTree, layout.element);
      this.litLayout = null;
      this.selectLayout(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (keyDownFlags["KeyW"]) {
      this.litLayout = null;
      FrameElement.splitElementHorizontal(
        this.frameTree,
        layout.element
      );
      this.selectLayout(null);
      this.onCommit();
      this.redraw();
      return "done";
    }
    if (keyDownFlags["KeyS"]) {
      this.litLayout = null;
      FrameElement.splitElementVertical(
        this.frameTree,
        layout.element
      );
      this.selectLayout(null);
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
    if (this.selectedLayout?.element != layout.element) {
      this.selectLayout(layout);
      this.redraw();
      return { select: layout };
    } else {
      return { layout: layout };
    }
  }

  changeFocus(layer: Layer) {
    if (layer != this) {
      if (this.selectedLayout || this.selectedBorder) {
        this.selectedBorder = null;
        this.doSelectLayout(null);
      }
    }
  }

  async *pointer(p: Vector, payload: any) {
    if (payload.select) {
      // changeFocusのためにacceptsに{select:layout}を変えさせたので、ここでは何もしない 
    } else if (payload.layout) {
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
      this.litBorder = this.selectedBorder = payload.border;
      this.selectLayout(null);
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
    const films = element.filmStack.getOperationTargetFilms();

    try {
      const transformer = new FilmStackTransformer(paperSize, films);

      yield* scale(this.getPaperSize(), p, (q) => {
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

      yield* rotate(p, (q) => {
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
    const paperSize = this.getPaperSize();
    const element = layout.element;
    const films = element.filmStack.getOperationTargetFilms();
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

  importMedia(layoutlet: Layout, media: Media): void {
    const paperSize = this.getPaperSize();
    // calc expansion to longer size

    const film = new Film();
    film.media = media;
    film.n_scale = 1;
    film.rotation = 0;
    film.reverse = [1, 1];
    film.n_translation = [0, 0];

    layoutlet.element.filmStack.films.push(film);
      
    const transformer = new FilmStackTransformer(paperSize, layoutlet.element.filmStack.films);
    transformer.scale(0.01);
    constraintLeaf(paperSize, layoutlet);
    this.onCommit();
    this.redraw();
  }

  updateSelectedLayout(): void {
    if (!this.selectedLayout) { return; }
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    this.selectLayout(findLayoutOf(rootLayout, this.selectedLayout.element));

    if (this.focusedPadding) {
      const handle = this.focusedPadding.handle;
      this.focusedPadding = findPaddingOf(this.selectedLayout, handle, PADDING_HANDLE_INNER_WIDTH, PADDING_HANDLE_OUTER_WIDTH);
    }
  }

  updateBorder(border: Border): void {
    const rootLayout = calculatePhysicalLayout(this.frameTree,this.getPaperSize(),[0, 0]);
    const newLayout = findLayoutOf(rootLayout, border.layout.element);
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
    const [x, y, w, h] = this.calculateSheetRect(layout.corners);
    const rscale = 1 / this.paper.matrix.a;

    const rect: Rect = [x+10, y+10, w-20, h-20];
    const unit: Vector = [...iconUnit];
    unit[0] *= rscale;
    unit[1] *= rscale;
    const cp = (ro, ou) => ClickableIcon.calcPosition(rect, unit, ro, ou);

    this.visibilityIcon.position = cp([0,0],[0,0]);
    this.visibilityIcon.index = layout.element.visibility;
    this.zminusIcon.position = cp([0,0],[1,0]);
    this.zplusIcon.position = cp([0,0],[2.5,0]);

    this.deleteIcon.position = cp([1,0],[0,0]);
    this.duplicateIcon.position = cp([1,0],[-1,0]);
    this.shiftIcon.position = cp([1,0],[-2,0]);
    this.unshiftIcon.position = cp([1,0],[-3,0]);
    this.resetPaddingIcon.position = cp([1,0],[-4,0]);

    this.splitHorizontalIcon.position = cp([0,1],[0,0]);
    this.splitVerticalIcon.position = cp([0,1],[1,0]);

    this.flipHorizontalIcon.position = cp([0,1], [2.5,0]);
    this.flipVerticalIcon.position = cp([0,1], [3.5,0]);
    this.fitIcon.position = cp([0,1], [4.5,0]);

    this.scaleIcon.position = cp([1,1],[0,0]);
    this.rotateIcon.position = cp([1,1],[-1,0]);
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
    const center = getRectCenter([...layout.origin, ...layout.size]);
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
  videoRedrawInterval: NodeJS.Timer;
  doSelectLayout(layout: Layout): void {
    if (layout != this.selectedLayout) {
      clearInterval(this.videoRedrawInterval);
      this.videoRedrawInterval = null;      
      if (this.selectedLayout) {
        for (const film of this.selectedLayout.element.filmStack.films) {
          if (film.media instanceof VideoMedia) {
            film.media.video.pause();
          }
        }
      }

      if (layout) {
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
    }

    this.selectedLayout = layout;
    this.relayoutIcons();
    this.onFocus(layout);
  }

  selectLayout(layout: Layout): void {
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
