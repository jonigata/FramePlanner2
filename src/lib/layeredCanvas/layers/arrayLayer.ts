import { Layer, Paper, type Dragging, type Viewport } from '../system/layeredCanvas';
import { PaperArray } from '../system/paperArray';
import type { Vector } from "../tools/geometry/geometry";
import { ClickableIcon } from "../tools/draw/clickableIcon";
import { keyDownFlags } from "../system/keyCache";

export class ArrayLayer extends Layer {
  array: PaperArray;
  onInsert: (index: number) => void;
  onDelete: (index: number) => void;

  trashIcons: ClickableIcon[] = [];
  insertIcons: ClickableIcon[] = [];

  constructor(papers: Paper[], gap: number, onInsert: (index: number) => void, onDelete: (index: number) => void) {
    super();
    this.array = new PaperArray(papers, gap);
    this.onInsert = onInsert;
    this.onDelete = onDelete;

    this.insertIcons = [];
    this.trashIcons = [];
    for (let i = 0; i < this.array.papers.length; i++) {
      const paper = this.array.papers[i];
      const s = paper.paper.size;
      const c = paper.center;
      const trashIcon = new ClickableIcon("page-trash.png",[64,64],[0.5,0],"ページ削除", () => 1 < this.array.papers.length);
      trashIcon.position = [c[0], c[1] + s[1] * 0.5 + 32];
      const insertIcon = new ClickableIcon("page-insert.png",[48,48],[0.5,0],"ページ挿入", null);
      insertIcon.position = [c[0] + s[0] * -0.5 - 32, c[1] + s[1] * 0.5 + 32];
      this.trashIcons.push(trashIcon);
      this.insertIcons.push(insertIcon);
    }

  }

  calculateLayout(matrix: DOMMatrix) {
    for (let paper of this.array.papers) {
      let m = matrix.translate(...paper.center);
      paper.paper.calculateLayout(m);
    }
  }

  pointerHover(p: Vector): boolean {
    this.insertIcons.forEach((e, i) => {
      if (e.contains(p)) {
        const q = e.center;
        this.hint([q[0], q[1] - 32],"ページ挿入")
        return true;
      }      
    });
    this.trashIcons.forEach((e, i) => {
      if (e.contains(p)) {
        const q = e.center;
        this.hint([q[0], q[1] - 32],"ページ削除")
        return true;
      }      
    });

    this.hint([0,0], null);

    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    paper.handlePointerHover(position);    
    return false;
  }

  accepts(p: Vector, button: number): any { 
    if (keyDownFlags["Space"] || 0 < button) {return null;}

    this.insertIcons.forEach((e, i) => {
      if (e.contains(p)) {
        this.onInsert(i);
        return null;
      }      
    });
    this.trashIcons.forEach((e, i) => {
      if (e.contains(p)) {
        this.onDelete(i);
        return null;
      }      
    });

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
    this.insertIcons.forEach(e => {
      e.render(ctx);
    });
    this.trashIcons.forEach(e => {
      e.render(ctx);
    });
    ctx.save();
    for (let paper of this.array.papers) {
      ctx.translate(...paper.center);
      paper.paper.render(ctx, depth);
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
    return paper.handleBeforeDoubleClick(position);
  }

  doubleClicked(p: Vector): boolean { 
    const {paper, position} = this.array.parentPositionToNearestChildPosition(p);
    if (paper.contains(position)) {
      paper.handleDoubleClicked(position);
    }
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
}