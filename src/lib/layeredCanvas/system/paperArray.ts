import type { Paper, Layer, Dragging } from '../system/layeredCanvas';
import { type Vector, type Rect, rectContains, rectToPointDistance } from "../tools/geometry/geometry";

// PaperArray: 複数のPaperをまとめて扱う
// 原点(0,0)は1枚目の中心
// 2枚名以降は1枚目の左に並ぶ
// paperの大きさが等しいとは限らない

export class PaperArray {
  papers: {paper: Paper, center: Vector}[];
  fold: number;
  gap: number;
  direction: number;

  constructor(papers: Paper[], fold: number, gap: number, direction: number) {
    this.fold = fold;
    this.gap = gap;
    this.direction = direction;

    this.papers = papers.map(e => ({ paper: e, center: [0, 0] }));
    this.recalculatePaperCenter();
  }

  recalculatePaperCenter() {
    // まず格段の高さを計算(その段のpaperの高さの最大値)
    const heights: number[] = [];
    let height = 0;
    for (let i = 0; i < this.papers.length; i++) {
      if (0 < i && i % this.fold === 0) {
        heights.push(height);
        height = 0;
      }
      height = Math.max(height, this.papers[i].paper.size[1]);
    }
    heights.push(height);

    let x = 0;
    let y = 0;
    for (let i = 0; i < this.papers.length; i++) {
      if (0 < i && i % this.fold === 0) {
        x = 0;
        const j = i / this.fold;
        y += heights[j-1] * 0.5 + heights[j] * 0.5;
        y += this.gap;
      }
      this.papers[i].center = [x, y];
      x += this.papers[i].paper.size[0] * 0.5 * this.direction;
      x += this.gap * this.direction;
      if (i < this.papers.length - 1) {
        x += this.papers[i + 1].paper.size[0] * 0.5 * this.direction;
      }
    }
  }

  findNearestPaperIndex(parentPosition: Vector): number {
    let minDist = Infinity;
    let minIndex = -1;
    for (let i = 0; i < this.papers.length; i++) {
      const e = this.papers[i];
      const x0 = e.center[0] - e.paper.size[0] * 0.5;
      const y0 = e.center[1] - e.paper.size[1] * 0.5;
      const r: Rect = [x0, y0, ...e.paper.size];
      
      // 紙の端との距離を計算
      const dist = rectToPointDistance(r, parentPosition);
      if (dist < minDist) {
        minDist = dist;
        minIndex = i;
      }
    }
    return minIndex;
  }

  findPaperIndex(paper: Paper): number {
    return this.papers.findIndex(e => e.paper === paper);
  }

  parentPositionToChildPosition(index: number, parentPosition: Vector): Vector {
    const e = this.papers[index];
    const x0 = e.center[0] - e.paper.size[0] * 0.5;
    const y0 = e.center[1] - e.paper.size[1] * 0.5;
    return [parentPosition[0] - x0, parentPosition[1] - y0];
  }

  parentPositionToNearestChildPosition(parentPosition: Vector): {index:number, position:Vector, paper: Paper} {
    const index = this.findNearestPaperIndex(parentPosition);
    const position = this.parentPositionToChildPosition(index, parentPosition);
    return {index, position, paper: this.papers[index].paper};
  }

  childPositionToParentPosition(index: number, childPosition: Vector): Vector {
    const e = this.papers[index];
    const x0 = e.center[0] - e.paper.size[0] * 0.5;
    const y0 = e.center[1] - e.paper.size[1] * 0.5;
    return [x0 + childPosition[0], y0 + childPosition[1]];
  }

  get redrawRequired(): boolean {
    return this.papers.some(e => e.paper.redrawRequired);
  }

  set redrawRequired(value: boolean) {
    this.papers.forEach(e => e.paper.redrawRequired = value);
  }

  set mode(value: any) {
    this.papers.forEach(e => e.paper.mode = value);
  }

}