export function add2D([x, y], [dx, dy]) { return [x + dx, y + dy]; }
export function multiply2D([x, y], [dx, dy]) { return [x * dx, y * dy]; }
export function dot2D(vectorA, vectorB) { return vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1]; }
export function cross2D(vectorA, vectorB) { return vectorA[0] * vectorB[1] - vectorA[1] * vectorB[0]; }
export function magnitude2D(vector) { return Math.sqrt(dot2D(vector, vector)); }
export function perpendicular2D([x, y], n=1) { return [-y*n, x*n]; }
export function reverse2D(v) { return [-v[0], -v[1]]; }
export function normalize2D([x, y], n=1) {
  const l = Math.hypot(x, y);
  if (l < 0.0001) { return [0.0, 0.0]; }
  return [n * x / l, n * y / l];
}
  
export function projectionScalingFactor2D(a, b) {
  return dot2D(a, b) / dot2D(b, b);
}
export function projection2D(a, b) {
  const factor = projectionScalingFactor2D(a, b);
  return [b[0] * factor, b[1] * factor];
}

export function signedAngle(lhs, rhs) {return Math.atan2(cross2D(lhs, rhs), dot2D(lhs, rhs));}
export function angleBetween(lhs, rhs) {return Math.abs(signedAngle(lhs, rhs));}
export function positiveAngle(lhs, rhs) {
  var a = signedAngle(lhs, rhs);
  return a < 0 ? a + Math.PI * 2 : a;
}

export function getSide(A, B, C, D) {
  const BA = [A[0] - B[0], A[1] - B[1]];
  const BD = [D[0] - B[0], D[1] - B[1]];
  const BC = [C[0] - B[0], C[1] - B[1]];
  const theta0 = positiveAngle(BA, BD);
  const theta1 = positiveAngle(BA, BC);

  if (theta0 == 0 || theta0 == theta1) {
    return 0;
  } else if (theta0 < theta1) {
    return 1;
  } else {
    return -1
  }
}

export function slerp2D(ca, cb, t) {
  const calen = magnitude2D(ca);
  const cblen = magnitude2D(cb);
  const lent = calen + (cblen - calen) * t;
  const cq = [ca[0] * lent / calen, ca[1] * lent / calen];

  const angle = signedAngle(ca, cb) * t;
  const xt = cq[0] * Math.cos(angle) - cq[1] * Math.sin(angle);
  const yt = cq[0] * Math.sin(angle) + cq[1] * Math.cos(angle);

  return [xt, yt];
}

export function normalizedAngle(angle) {
  return (angle + Math.PI) % (2 * Math.PI) - Math.PI;
}

export function angleDifference(angle1, angle2) {
  const phi = Math.abs(angle1 - angle2) % (Math.PI * 2);
  return phi > Math.PI ? Math.PI * 2 - phi : phi;
}

export function superEllipsePoint2D(a, b, n, theta) {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const x = a * Math.sign(cosTheta) * Math.pow(Math.abs(cosTheta), 2 / n);
  const y = b * Math.sign(sinTheta) * Math.pow(Math.abs(sinTheta), 2 / n);
  return [x, y];
}

export function circularAngleToEllipseAngle(rx, ry, theta) {
  const nx = Math.cos(theta);
  const ny = Math.sin(theta);

  const ex = rx * ry * nx / Math.sqrt(ry * ry * nx * nx + rx * rx * ny * ny);
  const ey = rx * ry * ny / Math.sqrt(ry * ry * nx * nx + rx * rx * ny * ny);

  return Math.atan2(ey / ry, ex / rx);
}

export function line(p1, p2, offset=[0,0]) {
  return [[p1[0] + offset[0], p1[1] + offset[1]], [p2[0] + offset[0], p2[1] + offset[1]]];
}

export function line2(p1, theta, offset=[0,0]) {
  const q = [p1[0] + offset[0], p1[1] + offset[1]];
  return [q, [q[0] + Math.cos(theta), q[1] + Math.sin(theta)]];
}

export function intersection(line1, line2) {
  const [[x1, y1], [x2, y2]] = line1;
  const [[x3, y3], [x4, y4]] = line2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom == 0) { return null; }

  const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return [x, y];
}

export function deg2rad(deg) { return deg * Math.PI / 180; }
export function rad2deg(rad) { return rad * 180 / Math.PI; }
