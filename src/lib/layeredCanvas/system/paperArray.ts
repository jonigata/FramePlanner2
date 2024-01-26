import type { Paper, Layer, Dragging } from '../system/layeredCanvas';
import type { Vector } from "../tools/geometry/geometry";

// PaperArray: 複数のPaperをまとめて扱う
// 原点(0,0)は1枚目の中心
// 2枚名以降は1枚目の左に並ぶ
// paperの大きさが等しいとは限らない

export class PaperArray {
  papers: {paper: Paper, center: Vector}[];
  gap: number;

  constructor(papers: Paper[], gap: number) {
    this.gap = gap;

    this.papers = papers.map(e => ({ paper: e, center: [0, 0] }));
    this.recalculatePaperCenter();
  }

  recalculatePaperCenter() {
    console.log("recalculatePaperCenter");
    let x = 0; // yは常に0
    for (let i = 0; i < this.papers.length; i++) {
      this.papers[i].center = [x, 0];
      x -= this.papers[i].paper.size[0] * 0.5;
      x -= this.gap;
      if (i < this.papers.length - 1) {
        x -= this.papers[i + 1].paper.size[0] * 0.5;
      }
    }
  }

  findNearestPaperIndex(parentPosition: Vector): number {
    let minDist = Infinity;
    let minIndex = -1;
    for (let i = 0; i < this.papers.length; i++) {
      // 紙の中にあれば断定
      const e = this.papers[i];
      const x0 = e.center[0] - e.paper.size[0] * 0.5;
      const x1 = e.center[0] + e.paper.size[0] * 0.5;
      if (x0 <= parentPosition[0] && parentPosition[0] <= x1) {
        return i;
      }
      // 紙の端との距離を計算
      const dist = Math.min(Math.abs(x0 - parentPosition[0]), Math.abs(x1 - parentPosition[0]));
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