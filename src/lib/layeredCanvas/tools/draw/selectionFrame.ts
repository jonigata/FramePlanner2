import { type Trapezoid, trapezoidPath } from "../geometry/trapezoid";
import type { Vector } from '../geometry/geometry';

export function drawSelectionFrame(ctx: CanvasRenderingContext2D, color: string, trapezoid: Trapezoid) {
  ctx.save();

  // まず白で枠を描く
  ctx.strokeStyle = "rgba(255, 255, 255, 1)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  trapezoidPath(ctx, trapezoid);
  ctx.stroke();

  // 指定された色で点線を描く
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  trapezoidPath(ctx, trapezoid);
  ctx.stroke();
  ctx.setLineDash([]);

  const drawCircle = (p: Vector) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 四隅に円を書く
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  drawCircle(trapezoid.topLeft);
  drawCircle(trapezoid.topRight);
  drawCircle(trapezoid.bottomLeft);
  drawCircle(trapezoid.bottomRight);

  ctx.restore();
}