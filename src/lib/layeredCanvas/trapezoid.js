
export function trapezoidPath(ctx, corners) {
  ctx.moveTo(...corners.topLeft);
  ctx.lineTo(...corners.topRight);
  ctx.lineTo(...corners.bottomRight);
  ctx.lineTo(...corners.bottomLeft);
  ctx.lineTo(...corners.topLeft);
  ctx.closePath();
}

export function trapezoidBoundingRect(corners) {
  return [
    Math.min(corners.topLeft[0], corners.bottomLeft[0]),
    Math.min(corners.topLeft[1], corners.topRight[1]),
    Math.max(corners.topRight[0], corners.bottomRight[0]),
    Math.max(corners.bottomLeft[1], corners.bottomRight[1]),
  ];
}
