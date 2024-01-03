export type Vector = [number, number];
export type Rect = [number, number, number, number];

export function add2D(v0: Vector, v1: Vector): Vector {
  return [v0[0] + v1[0], v0[1] + v1[1]];
}

export function subtract2D(v0: Vector, v1: Vector): Vector {
  return [v0[0] - v1[0], v0[1] - v1[1]];
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

export function distance2D(v0: Vector, v1: Vector): number {
  return magnitude2D(subtract2D(v0, v1));
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

export function intersection(line1: [Vector, Vector], line2: [Vector, Vector]): Vector | null {
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

export function isPointInTriangle(p: Vector, t: [Vector, Vector, Vector]) {
  const [x, y] = p;
  const [x0, y0] = t[0];
  const [x1, y1] = t[1]
  const [x2, y2] = t[2]

  const d1 = (x - x0) * (y1 - y0) - (x1 - x0) * (y - y0);
  const d2 = (x - x1) * (y2 - y1) - (x2 - x1) * (y - y1);
  const d3 = (x - x2) * (y0 - y2) - (x0 - x2) * (y - y2);

  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}