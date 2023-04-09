import { projectionScalingFactor2D, normalizedAngle, angleDifference, superEllipsePoint2D } from "./geometry.js";

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

export function generateSuperEllipsePoints(rect, angles) {
  return angles.map(angle => superEllipsePoint2D(rect[2] / 2, rect[3] / 2, 3, angle));
}

export function movePointsToRectCenter(points, rect) {
  const c = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2];
  const points2 = points.map(p => [p[0] + c[0], p[1] + c[1]]);
  return points2;
}

export function focusAnglesAroundIndex(angles, focusAngle, basicFocusFactor) {
  const focusedAngles = angles.map(angle => {
    const angleDiff = angleDifference(angle, focusAngle);
    const focusFactor = basicFocusFactor * (1 - angleDiff / Math.PI); 
    const focusedAngle = angle - focusFactor * angleDiff;
    return normalizedAngle(focusedAngle);
  });

  return focusedAngles;
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
  const q = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const [dx, dy] = [p2[0] - p1[0], p2[1] - p1[1]];
  const [nx, ny] = [-dy, dx];
  const [mx, my] = [
    nx / Math.sqrt(nx * nx + ny * ny),
    ny / Math.sqrt(nx * nx + ny * ny),
  ];
  const [qx, qy] = [q[0] + mx * bump, q[1] + my * bump];
  return [qx, qy];
}

export function subdividePointsWithBump(points, bump) {
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


