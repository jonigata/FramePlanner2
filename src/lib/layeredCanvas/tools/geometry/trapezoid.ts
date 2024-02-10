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

