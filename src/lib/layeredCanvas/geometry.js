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
