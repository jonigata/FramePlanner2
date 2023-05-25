import { add2D, projectionScalingFactor2D, center2D, subtract2D, perpendicular2D, angleDifference, superEllipsePoint2D, normalize2D } from "./geometry.js";

export function tailCoordToWorldCoord(center, tailTip, tailMid) {
  // bubble.centerを原点(O)とし、
  // X軸: O->tailTip Y軸: O->pependicular(O->tailTip)座標系の座標
  // この座標系をtail座標系と呼ぶ
  const [cx, cy] = center;
  const [tx, ty] = tailTip;
  const [mx, my] = tailMid;
  const [px, py] = [mx * tx + my * ty, mx * ty - my * tx];
  return [px + cx, py + cy];
};

export function worldCoordToTailCoord(center, tailTip, p) {
  const [ox, oy] = center;
  const [px, py] = [p[0] - ox, p[1] - oy];
  const [tx, ty] = tailTip;
  if (tx === 0 && ty === 0) {
    return [0,0];
  } else {
    const xFactor = projectionScalingFactor2D([px, py], [tx, ty]);
    const yFactor = -projectionScalingFactor2D([px, py], [-ty, tx]);
    return [xFactor, yFactor];
  }
}

export function generateRandomAngles(rng, numPoints, jitterFactor=0.5) {
  const angles = [];
  for (let i = 0; i < numPoints; i++) {
    const angleJitter = (rng() - 0.5) / numPoints * jitterFactor;
    const angle = (i / numPoints + angleJitter) * 2 * Math.PI;
    angles.push(angle);
  }
  return angles;
}

export function generateSuperEllipsePoints(size, angles, n = 3) {
  return angles.map(angle => superEllipsePoint2D(size[0] / 2, size[1] / 2, n, angle));
}

export function jitterDistances(rng, points, bump, jitter, step=2) {
  // 原点からの距離をjitterに応じてランダムに変化させる
  const newPoints = [];
  for (let i = 0; i < points.length; i++) {
    if (i % step === 0) {
      const [x, y] = points[i];
      const dist = Math.hypot(x, y);
      const factor = 1 + bump + (rng()-0.5) * jitter;
      const newDist = dist * factor;
      const [nx, ny] = [x * newDist / dist, y * newDist / dist];
      newPoints.push([nx, ny]);
    } else {
      newPoints.push(points[i]);
    }
  }
  return newPoints;
}

export function findNearestIndex(points, v) {
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

export function findNearestAngleIndex(angles, angle) {
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

export function subdivideSegmentWithBump(p1, p2, bump) {
  const c = center2D(p1, p2);
  const d = subtract2D(p2, p1);
  const n = perpendicular2D(d);
  const m = normalize2D(n, bump);
  const q = add2D(c, m);
  return q;
}

export function subdividePointsWithBump(size, points, bumpFactor) {
  const bump = Math.min(size[0], size[1]) * bumpFactor;
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[next];
    result.push(p1);
    result.push(subdivideSegmentWithBump(p1, p2, bump));
  }
  return result;
}

export function debumpPointsAroundIndex(points, bumpFactor, index) {
  const [prev, next] = [(index + points.length - 1) % points.length, (index + 1) % points.length];
  const p = [points[prev], points[index], points[next]];
  // p0, p1, p2いずれも原点からのベクトル
  // p0, p1, p2の長さの平均から、p1が突出している量だけp0,p2をp1の逆方向に押す
  const l = p.map(p => Math.hypot(p[0], p[1]));
  const lAvg = (l[0] + l[1] + l[2]) / 3;
  const diff = (l[1] - lAvg) * bumpFactor;
  const [x,y] = p[1];
  const [dx, dy] = [diff * x / l[1], diff * y / l[1]];
  p[0] = [p[0][0] - dx, p[0][1] - dy];
  p[2] = [p[2][0] - dx, p[2][1] - dy];
  const newPoints = [...points];
  newPoints[prev] = p[0];
  newPoints[next] = p[2];
  return newPoints;
}

export function color2string(c) {
  function f(x) { return Math.floor(x * 255); }
  return `rgba(${f(c.red)}, ${f(c.green)}, ${f(c.blue)}, ${c.alpha})`    
}
