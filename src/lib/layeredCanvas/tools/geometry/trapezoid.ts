import { isPointInTriangle, segmentIntersection, pointToTriangleDistance, subtract2D, cross2D, isTriangleClockwise, distance2D } from "./geometry";
import type { Vector, Rect } from "./geometry";
import * as paper from 'paper';
import { PaperOffset } from "paperjs-offset";

export type Trapezoid = { topLeft: Vector, topRight: Vector, bottomLeft: Vector, bottomRight: Vector };
export type TrapezoidCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
export const trapezoidCorners = ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const;

export function trapezoidPath(ctx: CanvasRenderingContext2D, corners: Trapezoid): void {
  ctx.moveTo(...corners.topLeft);
  ctx.lineTo(...corners.topRight);
  ctx.lineTo(...corners.bottomRight);
  ctx.lineTo(...corners.bottomLeft);
  ctx.lineTo(...corners.topLeft);
  ctx.closePath();
}

export function extendTrapezoid(t: Trapezoid, x: number, y: number): Trapezoid {
  return {
    topLeft: [t.topLeft[0] - x, t.topLeft[1] - y],
    topRight: [t.topRight[0] + x, t.topRight[1] - y],
    bottomLeft: [t.bottomLeft[0] - x, t.bottomLeft[1] + y],
    bottomRight: [t.bottomRight[0] + x, t.bottomRight[1] + y],
  };
}

export function rectToTrapezoid(r: Rect): Trapezoid {
  return {
    topLeft: [r[0], r[1]],
    topRight: [r[0] + r[2], r[1]],
    bottomLeft: [r[0], r[1] + r[3]],
    bottomRight: [r[0] + r[2], r[1] + r[3]],
  };
}

export function trapezoidBoundingRect(corners: Trapezoid): Rect {
  const box = [
    Math.min(corners.topLeft[0], corners.bottomLeft[0]),
    Math.min(corners.topLeft[1], corners.topRight[1]),
    Math.max(corners.topRight[0], corners.bottomRight[0]),
    Math.max(corners.bottomLeft[1], corners.bottomRight[1]),
  ];
  return [box[0], box[1], box[2] - box[0], box[3] - box[1]];
}

export function trapezoidCenter(corners: Trapezoid): Vector {
  return [
    (corners.topLeft[0] + corners.topRight[0] + corners.bottomLeft[0] + corners.bottomRight[0]) / 4,
    (corners.topLeft[1] + corners.topRight[1] + corners.bottomLeft[1] + corners.bottomRight[1]) / 4,
  ];
}

export function isPointInTrapezoid(p: Vector, t: Trapezoid) {
  return isPointInTriangle(p, [t.topLeft, t.topRight, t.bottomRight]) ||
    isPointInTriangle(p, [t.topLeft, t.bottomRight, t.bottomLeft]);
}

// 自己交差があっても正しく判定する
export function isPointInQuadrilateral(p: Vector, t: Trapezoid): boolean {
  const [A, B, C, D] = [t.topLeft, t.topRight, t.bottomRight, t.bottomLeft];

  const q = segmentIntersection([A, B], [C, D]);
  let result = false;
  if (q) {
    result = isPointInTriangle(p, [A, q, D]) || isPointInTriangle(p, [C, q, B]);
  } else {
    result = isPointInTriangle(p, [A, B, C]) || isPointInTriangle(p, [A, C, D]);
  }

  /*
  const r = trapezoidBoundingRect(t);  
  if (result && !rectContains(r, p)) {
    console.log("out of bounding rect", t, p, q);
  }
  */
  
  return result;
}

export function pointToQuadrilateralDistance(p: Vector, t: Trapezoid, ignoresinverted: boolean): number {
  const [A, B, C, D] = [t.topLeft, t.topRight, t.bottomRight, t.bottomLeft];

  // A C
  // |X|
  // D B
  const q = segmentIntersection([A, B], [C, D]);
  if (q) {
    return Math.min(
      pointToTriangleDistance(p, [A, q, D], ignoresinverted), 
      pointToTriangleDistance(p, [C, q, B], ignoresinverted));
  }

  // A-B
  //  X
  // C-D
  const q2 = segmentIntersection([A, D], [B, C]);
  if (q2) {
    return Math.min(
      pointToTriangleDistance(p, [A, B, q2], ignoresinverted),
      pointToTriangleDistance(p, [q2, C, D], ignoresinverted));
  }

  // A-B
  // | |
  // D-C
  return Math.min(
    pointToTriangleDistance(p, [A, B, C], ignoresinverted), 
    pointToTriangleDistance(p, [A, C, D], ignoresinverted));
}

export function isQuadrilateralConvex(t: Trapezoid): boolean {
  const vertices: Vector[] = [t.topLeft, t.topRight, t.bottomRight, t.bottomLeft];

  const numVertices = vertices.length;

  for (let i = 0; i < numVertices; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % numVertices];
    const nextNext = vertices[(i + 2) % numVertices];

    const edge1 = subtract2D(next, current);
    const edge2 = subtract2D(nextNext, next);

    const cross = cross2D(edge1, edge2);

    if (cross < 0) { // 外積が負の場合は凹
      return false;
    }
    // 外積が0の場合は辺が直線上にあるため、必要に応じて扱いを決定
    // ここでは0を許容して凸とみなします
  }

  // すべての外積が正または0であれば凸
  return true;
}

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
