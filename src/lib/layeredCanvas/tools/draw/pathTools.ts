import type { Vector } from "../geometry/geometry"

export function polygonToPath2D(points: Vector[]) {
  const path = new Path2D();
  if (0 < points.length) {
    path.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(...points[i]);
    }
    path.closePath();
  }
  return path;
}
