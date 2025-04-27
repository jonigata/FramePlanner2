export type Vector = [number, number];
export type Rect = [number, number, number, number]; // x, y, w, h
export type Box = [Vector, Vector]; // [topLeft, bottomRight

export function add2D(v0: Vector, v1: Vector): Vector {
  return [v0[0] + v1[0], v0[1] + v1[1]];
}

export function subtract2D(v0: Vector, v1: Vector): Vector {
  return [v0[0] - v1[0], v0[1] - v1[1]];
}

export function scale2D(v: Vector, n: number): Vector {
  return [v[0] * n, v[1] * n];
}

export function multiply2D(v0: Vector, v1: Vector): Vector {
  return [v0[0] * v1[0], v0[1] * v1[1]];
}

export function dot2D(vectorA: Vector, vectorB: Vector): number {
  return vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1];
}

export function cross2D(vectorA: Vector, vectorB: Vector): number {
  return vectorA[0] * vectorB[1] - vectorA[1] * vectorB[0];
}

export function magnitude2D(vector: Vector): number {
  return Math.hypot(...vector);
}

export function magnitudeSq2D(vector: Vector): number {
  return vector[0] * vector[0] + vector[1] * vector[1];
}

export function distance2D(v0: Vector, v1: Vector): number {
  return magnitude2D(subtract2D(v0, v1));
}

export function distanceSq2D(v0: Vector, v1: Vector): number {
  return magnitudeSq2D(subtract2D(v0, v1));
}

export function perpendicular2D(v: Vector, n: number = 1): Vector {
  const [x, y] = v;
  return [-y * n, x * n];
}

export function reverse2D(v: Vector): Vector {
  return [-v[0], -v[1]];
}

export function normalize2D(v: Vector, n: number = 1): Vector {
  const [x, y] = v;
  const l = Math.hypot(x, y);
  if (l < 0.0001) {
    return [0.0, 0.0];
  }
  return [n * x / l, n * y / l];
}

export function floor2D(v: Vector): Vector {
  return [Math.floor(v[0]), Math.floor(v[1])];
}

export function ceil2D(v: Vector): Vector {
  return [Math.ceil(v[0]), Math.ceil(v[1])];
}

export function round2D(v: Vector): Vector {
  return [Math.round(v[0]), Math.round(v[1])];
}

export function reciprocal2D(v: Vector): Vector {
  return [1 / v[0], 1 / v[1]];
}

export function projectionScalingFactor2D(a: Vector, b: Vector): number {
  return dot2D(a, b) / dot2D(b, b);
}

export function projection2D(a: Vector, b: Vector): Vector {
  const factor = projectionScalingFactor2D(a, b);
  return [b[0] * factor, b[1] * factor];
}

export function signedAngle(lhs: Vector, rhs: Vector): number {
  return Math.atan2(cross2D(lhs, rhs), dot2D(lhs, rhs));
}

export function angleBetween(lhs: Vector, rhs: Vector): number {
  return Math.abs(signedAngle(lhs, rhs));
}

export function positiveAngle(lhs: Vector, rhs: Vector): number {
  const a = signedAngle(lhs, rhs);
  return a < 0 ? a + Math.PI * 2 : a;
}

export function getSide(A: Vector, B: Vector, C: Vector, D: Vector): number {
  const BA: Vector = [A[0] - B[0], A[1] - B[1]];
  const BD: Vector = [D[0] - B[0], D[1] - B[1]];
  const BC: Vector = [C[0] - B[0], C[1] - B[1]];
  const theta0 = positiveAngle(BA, BD);
  const theta1 = positiveAngle(BA, BC);

  if (theta0 === 0 || theta0 === theta1) {
    return 0;
  } else if (theta0 < theta1) {
    return 1;
  } else {
    return -1;
  }
}

export function slerp2D(ca: Vector, cb: Vector, t: number): Vector {
  const calen = magnitude2D(ca);
  const cblen = magnitude2D(cb);
  const lent = calen + (cblen - calen) * t;
  const cq = [ca[0] * lent / calen, ca[1] * lent / calen];

  const angle = signedAngle(ca, cb) * t;
  const xt = cq[0] * Math.cos(angle) - cq[1] * Math.sin(angle);
  const yt = cq[0] * Math.sin(angle) + cq[1] * Math.cos(angle);

  return [xt, yt];
}

export function lerp2D(ca: Vector, cb: Vector, t: number): Vector {
  return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t];
}

export function normalizedAngle(angle: number): number {
  return (angle + Math.PI) % (2 * Math.PI) - Math.PI;
}

export function angleDifference(angle1: number, angle2: number): number {
  const phi = Math.abs(angle1 - angle2) % (Math.PI * 2);
  return phi > Math.PI ? Math.PI * 2 - phi : phi;
}

export function superEllipsePoint2D(a: number, b: number, n: number, theta: number): Vector {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const x = a * Math.sign(cosTheta) * Math.pow(Math.abs(cosTheta), 2 / n);
  const y = b * Math.sign(sinTheta) * Math.pow(Math.abs(sinTheta), 2 / n);
  return [x, y];
}

export function line(p1: Vector, p2: Vector, offset: Vector = [0, 0]): [Vector, Vector] {
  return [[p1[0] + offset[0], p1[1] + offset[1]], [p2[0] + offset[0], p2[1] + offset[1]]];
}

export function line2(p1: Vector, theta: number, offset: Vector = [0, 0]): [Vector, Vector] {
  const q: Vector = [p1[0] + offset[0], p1[1] + offset[1]];
  return [q, [q[0] + Math.cos(theta), q[1] + Math.sin(theta)]];
}

export function lineIntersection(line1: [Vector, Vector], line2: [Vector, Vector]): Vector | null {
  const [[x1, y1], [x2, y2]] = line1;
  const [[x3, y3], [x4, y4]] = line2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) {
    return null;
  }

  const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return [x, y];
}

export function deg2rad(deg: number): number {
  return deg * Math.PI / 180;
}

export function rad2deg(rad: number): number {
  return rad * 180 / Math.PI;
}

export function rotate2D(point: Vector, theta: number): Vector {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  return [point[0] * cosTheta - point[1] * sinTheta, point[0] * sinTheta + point[1] * cosTheta];
}

export function clamp(x: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, x));
}

export function center2D(p0: Vector, p1: Vector): Vector {
  return [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];
}

export function isPointInTriangle(p: Vector, tri: [Vector,Vector,Vector]): boolean {
  const [p0, p1, p2] = tri;

  const area2 =
    (p1[0] - p0[0]) * (p2[1] - p0[1]) - 
    (p1[1] - p0[1]) * (p2[0] - p0[0]);
  if (area2 === 0) {
    // 退化しているため、false を返す
    return false;
  }

  const s = (p0[0] - p2[0]) * (p[1] - p2[1]) - (p0[1] - p2[1]) * (p[0] - p2[0]);
  const t = (p1[0] - p0[0]) * (p[1] - p0[1]) - (p1[1] - p0[1]) * (p[0] - p0[0]);

  if ((s < 0) !== (t < 0) && s !== 0 && t !== 0) {
      return false;
  }

  const d = (p2[0] - p1[0]) * (p[1] - p1[1]) - (p2[1] - p1[1]) * (p[0] - p1[0]);

  return d === 0 || (d < 0) === (s + t <= 0);
}

export function pointToLineDistance(p: Vector, line: [Vector, Vector]): number {
  const [a, b] = line;
  const ab = subtract2D(b, a);
  const ap = subtract2D(p, a);

  const abLength = Math.hypot(ab[0], ab[1]);

  // 線分がほぼゼロ長の場合、点aから点pへの距離を返す
  if (abLength < 1e-10) {
    return Math.hypot(ap[0], ap[1]);
  }

  // 外積を利用して距離を計算
  const cross = Math.abs(ab[0] * ap[1] - ab[1] * ap[0]);
  return cross / abLength;
}

export function pointToSegmentDistance(p: Vector, segment: [Vector, Vector]): number {
  const [a, b] = segment;
  const ab = subtract2D(b, a);
  const ap = subtract2D(p, a);
  const abSquared = dot2D(ab, ab);

  // 線分がほぼゼロ長の場合、点aから点pへの距離を返す
  if (abSquared < 1e-10) {
    return Math.hypot(ap[0], ap[1]);
  }

  // 投影係数 t を計算し、0から1にクランプする
  const t = Math.max(0, Math.min(1, dot2D(ap, ab) / abSquared));

  // 投影点の座標を計算
  const projection: Vector = [a[0] + ab[0] * t, a[1] + ab[1] * t];

  // 点pから投影点への距離を計算
  return Math.hypot(p[0] - projection[0], p[1] - projection[1]);
}

export function pointToTriangleDistance(p: Vector, t: [Vector, Vector, Vector], ignoresinverted: boolean = false): number {
  // 3点が同一直線上にある場合、点と直線の距離を返す
  const colinear = getColinearLineSegment(t);
  if (colinear) {
    return pointToSegmentDistance(p, colinear);
  }

  // 三角形が反時計回りの場合、オプションによっては無視する
  if (ignoresinverted && isTriangleCounterClockwise(t)) {
    return Infinity;
  }

  // 三角形内部に点がある場合、0を返す
  if (isPointInTriangle(p, t)) {
    return 0;
  }

  // 最も近い辺までの距離を計算
  const [A, B, C] = t;
  const d0 = pointToSegmentDistance(p, [A, B]);
  const d1 = pointToSegmentDistance(p, [B, C]);
  const d2 = pointToSegmentDistance(p, [C, A]);
  return Math.min(d0, d1, d2);
}

export function rectIntersectsRect(r0: Rect, r1: Rect): boolean {
  return r0[0] < r1[0] + r1[2] && r0[0] + r0[2] > r1[0] && r0[1] < r1[1] + r1[3] && r0[1] + r0[3] > r1[1];
}

export function rectContains(r: Rect, p: Vector) {
  return p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3];
}

export function rectToPointDistance(r: Rect, p: Vector): number {
  const [x, y] = p;
  const [x0, y0, w, h] = r;
  const [x1, y1] = [x0 + w, y0 + h];

  var dx = Math.max(x0 - x, 0, x - x1);
  var dy = Math.max(y0 - y, 0, y - y1);
  return Math.sqrt(dx*dx + dy*dy);
}

export function rectToCorners(r: Rect): [Vector, Vector, Vector, Vector] {
  const [x, y, w, h] = r;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

export function extendRect(r: Rect, n: number): Rect {
  return [r[0] - n, r[1] - n, r[2] + 2 * n, r[3] + 2 * n];
}

export function vectorEquals(v0: Vector, v1: Vector): boolean {
  return v0[0] === v1[0] && v0[1] === v1[1];
}

export function isVectorZero(v: Vector): boolean {
  return v[0] === 0 && v[1] === 0;
}

export function rect2Box(r: Rect): Box {
  return [[r[0], r[1]], [r[0] + r[2], r[1] + r[3]]];
}

export function box2Rect(b: Box): Rect {
  return [b[0][0], b[0][1], b[1][0] - b[0][0], b[1][1] - b[0][1]];
}

export function ensureMinRectSize(minSize: number | Vector, r: Rect): Rect {
  let mx: number, my: number;
  if (typeof minSize === 'number') {
    mx = my = minSize;
  } else {
    [mx, my] = minSize;
  }

  let [x, y, w, h] = r;
  const nw = Math.max(w, mx);
  const nh = Math.max(h, my);
  x = x + (w - nw) / 2;
  y = y + (h - nh) / 2;
  w = nw;
  h = nh;
  return [x, y, w, h];
}

// アスペクト比を変更しない移動量最小の最小外接矩形
export function computeConstraintedRect(targetRect: Rect, constraintRect: Rect): { scale: number, translation: Vector } {
  const [x0, y0, w, h] = constraintRect;
  const [x1, y1] = [x0 + w, y0 + h];
  const [_tx, _ty, tw, th] = targetRect;
  const [opx, opy] = getRectCenter(targetRect);
  const [cx, cy] = getRectCenter(constraintRect); 

  let scale = 1;
  if (tw * scale < w) { scale = w / tw; }
  if (th * scale < h) { scale = h / th; }
  const [npx, npy] = [(opx - cx) * scale + cx , (opy - cy) * scale + cy];

  const [nw, nh] = [tw * scale, th * scale];
  const [nx0, ny0] = [npx - nw / 2, npy - nh / 2];
  const [nx1, ny1] = [nx0 + nw, ny0 + nh];

  let [mx, my] = [0, 0];
  if (x0 < nx0) { mx -= nx0 - x0; }
  if (y0 < ny0) { my -= ny0 - y0; }
  if (nx1 < x1) { mx += x1 - nx1; }
  if (ny1 < y1) { my += y1 - ny1; }

  return { scale, translation: [mx / scale, my / scale] };
}

export function computeBoundingRectFromRects(rects: Rect[]): Rect {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rects) {
    const [x, y, w, h] = r;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + w);
    y1 = Math.max(y1, y + h);
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

export function getRectCenter(r: Rect): Vector {
  return [r[0] + r[2] / 2, r[1] + r[3] / 2];
}

export function translateRect(r: Rect, v: Vector): Rect {
  return [r[0] + v[0], r[1] + v[1], r[2], r[3]];
}

export function scaleRect(r: Rect, s: number): Rect {
  return [r[0] * s, r[1] * s, r[2] * s, r[3] * s];
}

export function minimumBoundingScale(objectSize: Vector, containerSize: Vector): number {
  return Math.max(containerSize[0] / objectSize[0], containerSize[1] / objectSize[1]);
}

export function isTriangleClockwise([v0, v1, v2]: [Vector, Vector, Vector]): boolean {
  const cross = (v1[0] - v0[0]) * (v2[1] - v0[1]) - (v1[1] - v0[1]) * (v2[0] - v0[0]);
  return 0 < cross; // Y軸が数学的座標系と逆のため
}

export function isTriangleCounterClockwise([v0, v1, v2]: [Vector, Vector, Vector]): boolean {
  const cross = (v1[0] - v0[0]) * (v2[1] - v0[1]) - (v1[1] - v0[1]) * (v2[0] - v0[0]);
  return cross < 0; // Y軸が数学的座標系と逆のため
}

export function getColinearLineSegment(tri: [Vector, Vector, Vector]): [Vector, Vector] | null {
  const [p1, p2, p3] = tri;

  function vectorNearlyEquals(v0: Vector, v1: Vector): boolean {
    return distanceSq2D(v0, v1) < 1e-10;
  }
  
  // 同一点の判定(結果が結局点になることもある)
  if (vectorNearlyEquals(p1, p3)) {return [p1, p2];}
  if (vectorNearlyEquals(p1, p2)) {return [p2, p3];}
  if (vectorNearlyEquals(p2, p3)) {return [p1, p3];}

  // ここまできたら3点すべて別

  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = p3;
  if (1e-10 <= Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1))) {
    // 面積がある＝直線ではない
    return null;
  }

  const [dx, dy] = subtract2D(p3, p1);
  const lengthSquared = magnitudeSq2D([dx, dy]); // すでに判定済みなので0でない
  let t = ((x2 - x1) * dx + (y2 - y1) * dy) / lengthSquared;

  if (t <= 0) {
      return [p2, p3];
  } else if (t >= 1) {
      return [p1, p2];
  } else {
      return [p1, p3];
  }
}

export function signed2DTriangleArea(a: Vector, b: Vector, c: Vector): number {
  return (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]);
}

// ゲームプログラミングのためのリアルタイム衝突判定 p151
// ただしいくつかの境界条件を加味してrobustにした
export function testSegmentIntersection(s0: [Vector, Vector], s1: [Vector, Vector]): [number, Vector] | null {
  const [a, b] = s0;
  const [c, d] = s1;

  const a1 = signed2DTriangleArea(a, b, d);
  const a2 = signed2DTriangleArea(a, b, c);

  // 修正点: < 0 を <= 0 に変更して端点での交差を許容
  if (a1 * a2 <= 0) {
    const a3 = signed2DTriangleArea(c, d, a);
    const a4 = signed2DTriangleArea(c, d, b);

    // 同様に < 0 を <= 0 に変更
    if (a3 * a4 <= 0) {
      const denominator = a1 - a2;
      // denominator が 0 の場合、線分が平行または重なっている
      if (denominator === 0) {
        // 特殊ケースの処理（必要に応じて実装）
        return null;
      }
      const t = a3 / denominator;
      // t が 0 <= t <= 1 の範囲にあることを確認
      if (t >= 0 && t <= 1) {
        const p = lerp2D(a, b, t);
        return [t, p];
      }
    }
  }

  return null;
}

export function segmentIntersection(s0: [Vector, Vector], s1: [Vector, Vector]): Vector | null {
  const result = testSegmentIntersection(s0, s1);
  return result ? result[1] : null;
}

export function denormalizePositionInRect(p: Vector, r: Rect): Vector {
  return [r[0] + r[2] * p[0], r[1] + r[3] * p[1]];
}

// segmentでも問題ない
export function offsetLine(p0: Vector, p1: Vector, offset: number): [Vector, Vector] {
  const direction = subtract2D(p1, p0);
  const directionNormalized = normalize2D(direction);
  const perpVector = perpendicular2D(directionNormalized, offset);
  
  const offsetP0 = add2D(p0, perpVector);
  const offsetP1 = add2D(p1, perpVector);
  
  return [offsetP0, offsetP1];
}