import type { Vector } from "./geometry";

/**
 * 多角形 poly を無限直線 p0→p1 に沿って片側だけ残す。
 * keepLeft = true なら p0→p1 の左側を残す。
 * p0 == p1でも特に問題ない。
 */
export function clipPolygonByLine(
  poly: Vector[],
  p0: Vector,
  p1: Vector,
  keepLeft: boolean = true
): Vector[] {
  const out: Vector[] = [];

  const isInside = (p: Vector) =>
    ((p1[0] - p0[0]) * (p[1] - p0[1]) - (p1[1] - p0[1]) * (p[0] - p0[0])) *
      (keepLeft ? 1 : -1) >= 0;

  const intersect = (a: Vector, b: Vector): Vector => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const nx = p1[1] - p0[1];
    const ny = -(p1[0] - p0[0]);
    const t = ((p0[0] - a[0]) * nx + (p0[1] - a[1]) * ny) / (dx * nx + dy * ny);
    return [a[0] + t * dx, a[1] + t * dy];
  };

  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const currIn = isInside(curr);
    const prevIn = isInside(prev);

    if (currIn) {
      if (!prevIn) out.push(intersect(prev, curr));
      out.push(curr);
    } else if (prevIn) {
      out.push(intersect(prev, curr));
    }
  }
  return out;
}
