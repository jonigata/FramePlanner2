import type { Paper, Layer, Dragging } from '../system/layeredCanvas';
import type { Vector } from "../tools/geometry/geometry";

// PaperArray: 複数のPaperをまとめて扱う
// 1枚目の中央が[0,0]
// 2枚名以降は1枚目の左に並ぶ
// paperの大きさが等しいとは限らない

export class PaperArray {
  papers: {paper: Paper, center: Vector}[];
  gap: number;

  constructor(papers: Paper[], gap: number) {
    this.gap = gap;

    let center = 0; // yは常に0
    this.papers = [];
    for (let i = 0; i < papers.length; i++) {
      this.papers.push({ paper: papers[i], center: [center, 0] })
      center -= papers[i].size[0] * 0.5 + gap;
      if (i < papers.length - 1) {
        center -= papers[i + 1].size[0] * 0.5;
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

  parentPositionToChildPosition(index: number, parentPosition: Vector): Vector {
    const e = this.papers[index];
    const x0 = e.center[0] - e.paper.size[0] * 0.5;
    return [parentPosition[0] - x0, parentPosition[1]];
  }

  parentPositionToNearestChildPosition(parentPosition: Vector): {index:number, position:Vector, paper: Paper} {
    const index = this.findNearestPaperIndex(parentPosition);
    const position = this.parentPositionToChildPosition(index, parentPosition);
    return {index, position, paper: this.papers[index].paper};
  }

}