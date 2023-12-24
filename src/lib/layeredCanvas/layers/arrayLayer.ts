import { Layer, Paper, type Dragging } from '../system/layeredCanvas';
import { PaperArray } from '../system/paperArray';
import type { Vector } from "../tools/geometry/geometry";

export class ArrayLayer extends Layer {
  array: PaperArray;

  constructor(papers: Paper[], gap: number) {
    super();
    this.array = new PaperArray(papers, gap);
  }

  pointerHover(point: Vector): boolean {
    const {paper, position} = this.array.parentPositionToNearestChildPosition(point);
    paper.handlePointerHover(position);    
    return false; // TODO: 実際問題として使われないと考えられるため
  }

  accepts(p: Vector): any { 
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

    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.array.papers.length; i++) {
      const center = this.array.papers[i].center;
      ctx.translate(center[0], center[1]);
      const e = this.array.papers[i];
      e.paper.render(ctx);
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

  get redrawRequired(): boolean {
    return this.array.redrawRequired;
  }
  set redrawRequired(value: boolean) {
    this.array.redrawRequired = value;
  }
}