import { Layer, Paper, type Dragging, type Viewport } from '../system/layeredCanvas';
import { PaperArray } from '../system/paperArray';
import type { Vector } from "../tools/geometry/geometry";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { keyDownFlags } from "../system/keyCache";
import { drawSelectionFrame } from "../tools/draw/selectionFrame";
import { rectToTrapezoid } from '../tools/geometry/trapezoid';

export class ArrayLayer extends Layer {
  array: PaperArray;
  onInsert: (index: number) => void;
  onDelete: (index: number) => void;
  onMove: (from: number[], to: number) => void;
  onBatchImaging: (index: number) => void;

  trashIcons: ClickableIcon[] = [];
  markIcons: ClickableIcon[] = [];
  insertIcons: ClickableIcon[] = [];
  imagingIcons: ClickableIcon[] = [];
  markFlags: boolean[] = [];

  constructor(
    papers: Paper[], 
    fold: number, 
    gap: number, 
    direction: number, 
    onInsert: (index: number) => void, 
    onDelete: (index: number) => void,
    onMove: (from: number[], to: number) => void,
    onBatchImaging: (index: number) => void) {

    super();
    this.array = new PaperArray(papers, fold, gap, direction);
    this.onInsert = onInsert;
    this.onDelete = onDelete;
    this.onMove = onMove;
    this.onBatchImaging = onBatchImaging;

    this.insertIcons = [];
    this.trashIcons = [];
    const mp = () => this.paper.matrix;
    for (let i = 0; i < this.array.papers.length; i++) {
      const trashIcon = new ClickableIcon(["page-trash.png"],[32,32],[0.5,0],"ページ削除", () => 1 < this.array.papers.length, mp);
      this.trashIcons.push(trashIcon);
      const markIcon = new ClickableIcon(["page-mark.png", "page-mark-on.png"],[32,32],[0.5,0],"ページマーク", () => 1 < this.array.papers.length, mp);
      this.markIcons.push(markIcon);
      const imagingIcon = new ClickableIcon(["page-imaging.png"],[32,32],[0.5,0],"バッチ画像生成", null, mp);
      this.imagingIcons.push(imagingIcon);
      this.markFlags[i] = false;
    }
    for (let i = 0; i <= this.array.papers.length; i++) {
      const insertIcon = new ClickableIcon(["page-insert.png", "page-insert-vertical.png", "page-paste.png"],[24,24],[0.5,0],"ページ挿入", null, mp);
      this.insertIcons.push(insertIcon);
    }
    this.calculateIconPositions();
  }

  calculateLayout(matrix: DOMMatrix) {
    this.array.recalculatePaperCenter();
    for (let paper of this.array.papers) {
      let m = matrix.translate(...paper.center);
      paper.paper.calculateLayout(m);
    }

    this.calculateIconPositions();
  }

  calculateIconPositions() {
    const gap = this.array.gap;
    for (let i = 0; i < this.array.papers.length; i++) {
      const paper = this.array.papers[i];
      const s = paper.paper.size;
      const c = paper.center;
      const trashIcon = this.trashIcons[i];
      const markIcon = this.markIcons[i];
      const imagingIcon = this.imagingIcons[i];
      markIcon.index = this.markFlags[i] ? 1 : 0;
      if (this.array.fold === 1) {
        trashIcon.pivot = [0, 0.5];
        trashIcon.position = [c[0] + s[0] * 0.5 + 60, c[1] + 90];
        markIcon.pivot = [0, 0.5];
        markIcon.position = [c[0] + s[0] * 0.5 + 60, c[1] + 180];
        markIcon.index = this.markFlags[i] ? 1 : 0;
        imagingIcon.pivot = [0, 0.5];
        imagingIcon.position = [c[0] + s[0] * 0.5 + 60, c[1] - 90];
      } else {
        trashIcon.pivot = [0.5, 0];
        trashIcon.position = [c[0] - 90, c[1] + s[1] * 0.5 + 16];
        markIcon.pivot = [0.5, 0];
        markIcon.position = [c[0] - 180, c[1] + s[1] * 0.5 + 16];
        imagingIcon.pivot = [0.5, 0];
        imagingIcon.position = [c[0] + 90, c[1] + s[1] * 0.5 + 16];
      }
    }
    for (let i = 0; i < this.array.papers.length; i++) {
      const paper = this.array.papers[i];
      const s = paper.paper.size;
      const c = paper.center;
      const insertIcon = this.insertIcons[i];
      if (this.array.fold === 1) {
        insertIcon.index = 1;
        insertIcon.pivot = [0, 0.5];
        insertIcon.position = [c[0] + s[0] * 0.5 + 60, c[1] - s[1] * 0.5 - gap * 0.5];
      } else {
        insertIcon.index = 0;
        insertIcon.pivot = [0.5, 0];
        insertIcon.position = [c[0] + s[0] * 0.5 + gap * 0.5, c[1] + s[1] * 0.5 + 16];
      }
    }

    // 最後のページの挿入アイコン
    const paper = this.array.papers[this.array.papers.length - 1];
    const s = paper.paper.size;
    const c = paper.center;
    const insertIcon = this.insertIcons[this.array.papers.length];
    if (this.array.fold === 1) {
      insertIcon.index = 1;
      insertIcon.pivot = [0, 0.5];
      insertIcon.position = [c[0] + s[0] * 0.5 + 60, c[1] + s[1] * 0.5 + gap * 0.5];
    } else {
      insertIcon.index = 0;
      insertIcon.pivot = [0.5, 0];
      insertIcon.position = [c[0] - s[0] * 0.5 - gap * 0.5, c[1] + s[1] * 0.5 + 32];
    }
    if (this.markFlags.some(e => e)) {
      for (let i = 0; i <= this.array.papers.length; i++) {
        this.insertIcons[i].index = 2;
      }
    }
  }

  pointerHover(p: Vector): boolean {
    if (!this.interactable) {return false;}

    for (let icons of [this.insertIcons, this.trashIcons, this.markIcons, this.imagingIcons]) {
      for (let icon of icons) {
        if (icon.hintIfContains(p, this.hint.bind(this))) {
          return true;
        }
      }
    }

    this.hint([0,0], null);

    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    paper.handlePointerHover(position);    
    return false;
  }

  accepts(p: Vector, button: number): any { 
    if (keyDownFlags["Space"] || 0 < button) {return null;}

    for (let [i, e] of this.insertIcons.entries()) {
      if (e.contains(p)) {
        if (this.markFlags.some(e => e)) {
          // markFlagsが立っているページが前にある場合、その分indexを減らす
          const n = this.markFlags.slice(0, i).filter(e => e).length;
          this.onMove(this.markFlags.map((e, i) => e ? i : -1).filter(e => 0 <= e), i - n);
        } else {
          this.onInsert(i);
        }
        return null;
      }      
    }
    for (let [i, e] of this.trashIcons.entries()) {
      if (e.contains(p)) {
        this.onDelete(i);
        return null;
      }      
    }
    for (let [i, e] of this.markIcons.entries()) {
      if (e.contains(p)) {
        this.markFlags[i] = !this.markFlags[i];
        this.calculateIconPositions();
        this.redraw();
        return null;
      }      
    }
    for (let [i, e] of this.imagingIcons.entries()) {
      if (e.contains(p)) {
        this.onBatchImaging(i);
        return null;
      }      
    }

    const {paper, index, position} = this.array.parentPositionToNearestChildPosition(p);
    const innerDragging = paper.handleAccepts(position, button);
    return innerDragging ? { paper, index, innerDragging } : null;
  }

  changeFocus(dragging: Dragging): void {
    if (dragging?.layer === this) {
      const { index, innerDragging } = dragging.payload;
      for (let i = 0; i < this.array.papers.length; i++) {
        this.array.papers[i].paper.changeFocus(i === index ? innerDragging : null);
      }
    } else {
      for (let i = 0; i < this.array.papers.length; i++) {
        this.array.papers[i].paper.changeFocus(null);
      }
    }
  }

  pointerDown(p: Vector, payload: any): void {
    const { paper, index, innerDragging } = payload;
    const q = this.array.parentPositionToChildPosition(index, p);
    paper.handlePointerDown(q, innerDragging);
  }

  pointerMove(p: Vector, payload: any): void {
    const { paper, index, innerDragging } = payload;
    const q = this.array.parentPositionToChildPosition(index, p);
    paper.handlePointerMove(q, innerDragging);
  }

  pointerUp(p: Vector, payload: any): void {
    const { paper, index, innerDragging } = payload;
    const q = this.array.parentPositionToChildPosition(index, p);
    paper.handlePointerUp(q, innerDragging);
  }

  pointerCancel(p: Vector, payload: any): void {
    const { paper, index, innerDragging } = payload;
    const q = this.array.parentPositionToChildPosition(index, p);
    paper.handleCancel(q, innerDragging);
  }

  prerender(): void {
    for (let i = 0; i < this.array.papers.length; i++) {
      this.array.papers[i].paper.prerender();
    }
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (this.interactable) {
      this.insertIcons.forEach(e => {
        e.render(ctx);
      });
      this.trashIcons.forEach(e => {
        e.render(ctx);
      });
      this.markIcons.forEach(e => {
        e.render(ctx);
      });
      this.imagingIcons.forEach(e => {
        e.render(ctx);
      });
    }
    this.array.papers.forEach((paper, i) => { 
      ctx.save();
      ctx.translate(...paper.center);
      paper.paper.render(ctx, depth);
      ctx.restore();
      if (this.markFlags[i]) {
        const r = this.array.getPaperRect(i);
        drawSelectionFrame(ctx, "rgba(255, 128, 128, 1)", rectToTrapezoid(r));
      }
    });
  }

  dropped(p: Vector, image: HTMLImageElement): boolean {
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    return paper.handleDrop(position, image);
  }

  beforeDoubleClick(p: Vector): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    return paper.handleBeforeDoubleClick(position);
  }

  doubleClicked(p: Vector): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    if (paper.contains(position)) {
      return paper.handleDoubleClicked(position);
    }
    return false;
  }

  async keyDown(p: Vector, event: KeyboardEvent): Promise<boolean> { 
    const {index, paper, position} = this.array.parentPositionToNearestChildPosition(p);
    return await paper.handleKeyDown(position, event);
  }

  wheel(p: Vector, delta: number): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    return paper.handleWheel(position, delta);
  }

  flushHints(viewport: Viewport): void {
    for (let paper of this.array.papers) {
      paper.paper.flushHints(viewport);
    }
  }

  renderDepths(): number[] { 
    // paper全部から集めてsort/uniq
    const depths = this.array.papers.flatMap(p => p.paper.renderDepths());
    return [...new Set(depths)].sort((a,b) => a - b);
  }

  get redrawRequired(): boolean {
    return this.array.redrawRequired;
  }
  set redrawRequired(value: boolean) {
    this.array.redrawRequired = value;
  }

  set mode(mode: any) { 
    super.mode = mode;
    this.array.mode = mode; 
  }
  get mode() { return super.mode; }

  get interactable(): boolean {return this.mode == null; }
}