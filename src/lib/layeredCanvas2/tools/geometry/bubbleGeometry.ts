import { add2D, lerp2D, multiply2D, projectionScalingFactor2D, center2D, subtract2D, perpendicular2D, angleDifference, superEllipsePoint2D, normalize2D } from "./geometry";
import type { Vector } from "./geometry";

export function tailCoordToWorldCoord(center: Vector, tailTip: Vector, tailMid: Vector): Vector {
  const [cx, cy] = center;
  const [tx, ty] = tailTip;
  const [mx, my] = tailMid;
  const [px, py] = [mx * tx + my * ty, mx * ty - my * tx];
  return [px + cx, py + cy];
};

export function worldCoordToTailCoord(center: Vector, tailTip: Vector, p: Vector): Vector {
  const [ox, oy] = center;
  const [px, py] = [p[0] - ox, p[1] - oy];
  const [tx, ty] = tailTip;
  if (tx === 0 && ty === 0) {
    return [0, 0];
  } else {
    const xFactor = projectionScalingFactor2D([px, py], [tx, ty]);
    const yFactor = -projectionScalingFactor2D([px, py], [-ty, tx]);
    return [xFactor, yFactor];
  }
}

export function generateRandomAngles(rng: () => number, numPoints: number, jitterFactor: number = 0.5): number[] {
  const angles: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    const angleJitter = (rng() - 0.5) / numPoints * jitterFactor;
    const angle = (i / numPoints + angleJitter) * 2 * Math.PI;
    angles.push(angle);
  }
  return angles;
}

export function generateSuperEllipsePoints(size: Vector, angles: number[], n: number = 3): Vector[] {
  return angles.map(angle => superEllipsePoint2D(size[0] / 2, size[1] / 2, n, angle));
}


export function jitterDistances(rng: () => number, points: Vector[], bump: number, jitter: number, step = 2): Vector[] {
  // 原点からの距離をjitterに応じてランダムに変化させる
  const newPoints: Vector[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i % step === 0) {
      const [x, y] = points[i];
      const dist = Math.hypot(x, y);
      const factor = 1 + bump + (rng() - 0.5) * jitter;
      const newDist = dist * factor;
      const [nx, ny] = [x * newDist / dist, y * newDist / dist];
      newPoints.push([nx, ny]);
    } else {
      newPoints.push(points[i]);
    }
  }
  return newPoints;
}

export function findNearestIndex(points: Vector[], v: Vector): number {
  let minDist = Infinity;
  let minIndex = -1;
  for (let i = 0; i < points.length; i++) {
    const dist = Math.hypot(points[i][0] - v[0], points[i][1] - v[1]);
    if (dist < minDist) {
      minDist = dist;
      minIndex = i;
    }
  }
  return minIndex;
}

export function findNearestAngleIndex(angles: number[], angle: number): number {
  let minAngleDiff = Infinity;
  let minIndex = -1;
  for (let i = 0; i < angles.length; i++) {
    const angleDiff = angleDifference(angles[i], angle);
    if (angleDiff < minAngleDiff) {
      minAngleDiff = angleDiff;
      minIndex = i;
    }
  }
  return minIndex;
}

export function subdivideSegmentWithBump(p1: Vector, p2: Vector, bump: number): Vector {
  const c = center2D(p1, p2);
  const d = subtract2D(p2, p1);
  const n = perpendicular2D(d);
  const m = normalize2D(n, bump);
  const q = add2D(c, m);
  return q;
}

export function subdividePointsWithBump(size: Vector, points: Vector[], bumpFactor: number): Vector[] {
  const bump = Math.min(size[0], size[1]) * bumpFactor;
  const result: Vector[] = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[next];
    result.push(p1);
    result.push(subdivideSegmentWithBump(p1, p2, bump));
  }
  return result;
}

export function debumpPointsAroundIndex(points: Vector[], bumpFactor: number, index: number): Vector[] {
  const indices = [
    (index + points.length - 2),
    (index + points.length - 1),
    index,
    (index + 1),
    (index + 2),
  ].map(x => x % points.length);
  const p = indices.map(x => points[x]);

  const bf: Vector = [bumpFactor, bumpFactor];
  const q0 = multiply2D(lerp2D(p[2], p[0], 0.5), bf);
  const q1 = multiply2D(lerp2D(p[2], p[4], 0.5), bf);

  const newPoints = [...points];
  newPoints[indices[1]] = q0;
  newPoints[indices[3]] = q1;
  return newPoints;
}

export function color2string(c: { red: number, green: number, blue: number, alpha: number }): string {
  function f(x: number): number { return Math.floor(x * 255); }
  return `rgba(${f(c.red)}, ${f(c.green)}, ${f(c.blue)}, ${c.alpha})`;
}
