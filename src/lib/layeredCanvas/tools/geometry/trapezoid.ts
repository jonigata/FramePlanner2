import { isPointInTriangle } from "./geometry";
import type { Vector, Rect } from "./geometry";

export type Trapezoid = { topLeft: Vector, topRight: Vector, bottomLeft: Vector, bottomRight: Vector };
export type TrapezoidCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
export const trapezoidCorners = ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const;

export function trapezoidPath(ctx, corners: Trapezoid): void {
  ctx.moveTo(...corners.topLeft);
  ctx.lineTo(...corners.topRight);
  ctx.lineTo(...corners.bottomRight);
  ctx.lineTo(...corners.bottomLeft);
  ctx.lineTo(...corners.topLeft);
  ctx.closePath();
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
