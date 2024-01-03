import { Layer, Paper, type Dragging, type Viewport } from '../system/layeredCanvas';
import { PaperArray } from '../system/paperArray';
import type { Vector } from "../tools/geometry/geometry";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { keyDownFlags } from "../system/keyCache";

export class ArrayLayer extends Layer {
  array: PaperArray;
  onInsert: (index: number) => void;
  onDelete: (index: number) => void;

  trashIcon: ClickableIcon;
  insertIcon: ClickableIcon;

  constructor(papers: Paper[], gap: number, onInsert: (index: number) => void, onDelete: (index: number) => void) {
    super();
    this.array = new PaperArray(papers, gap);
    console.log(onInsert, onDelete);
    this.onInsert = onInsert;
    this.onDelete = onDelete;

    const s = this.array.papers[0].paper.size;
    this.trashIcon = new ClickableIcon("page-trash.png",[64,64],[0.5,0],"ページ削除", () => 1 < this.array.papers.length);
    this.trashIcon.position = [0, s[1] * 0.5 + 32];
    this.insertIcon = new ClickableIcon("page-insert.png",[48,48],[0.5,0],"ページ挿入", null);
    this.insertIcon.position = [s[0] * -0.5 - 32, s[1] * 0.5 + 32];
  }

  calculateLayout(matrix: DOMMatrix) {
    for (let paper of this.array.papers) {
      let m = matrix.translate(...paper.center);
      paper.paper.calculateLayout(m);
    }
  }

  pointerHover(point: Vector): boolean {
    const {paper, position} = this.array.parentPositionToNearestChildPosition(point);
    paper.handlePointerHover(position);    
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  accepts(p: Vector): any { 
    if (keyDownFlags["Space"]) {return null;}
    if (this.insertIcon.contains(p)) {
      console.log(this.onInsert);
      this.onInsert(0);
      return null;
    }
    if (this.trashIcon.contains(p)) {
      this.onDelete(0);
      return null;
    }

    const {paper, index, position} = this.array.parentPositionToNearestChildPosition(p);
    const innerDragging = paper.handleAccepts(position);
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

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let paper of this.array.papers) {
      ctx.translate(...paper.center);
      paper.paper.render(ctx);
      this.trashIcon.render(ctx);
      this.insertIcon.render(ctx);
    }
    ctx.restore();
  }

  dropped(p: Vector, image: HTMLImageElement): boolean {
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    paper.handleDrop(position, image);
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  beforeDoubleClick(p: Vector): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    paper.handleBeforeDoubleClick(position);
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  doubleClicked(p: Vector): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    paper.handleDoubleClicked(position);
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  async keyDown(p: Vector, event: KeyboardEvent): Promise<boolean> { 
    const {index, paper, position} = this.array.parentPositionToNearestChildPosition(p);
    await paper.handleKeyDown(position, event);
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  wheel(p: Vector, delta: number): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    paper.handleWheel(position, delta);
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  flushHints(viewport: Viewport): void {
    for (let paper of this.array.papers) {
      paper.paper.flushHints(viewport);
    }
  }

  get redrawRequired(): boolean {
    return this.array.redrawRequired;
  }
  set redrawRequired(value: boolean) {
    this.array.redrawRequired = value;
  }
}