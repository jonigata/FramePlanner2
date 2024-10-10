import { type Trapezoid, trapezoidPath, trapezoidBoundingRect } from "../geometry/trapezoid";
import { type Vector, type Rect, extendRect, ensureMinRectSize, scale2D } from '../geometry/geometry';
import * as paper from 'paper';

const SHEET_MARGIN = 16;

export function drawSelectionFrame(ctx: CanvasRenderingContext2D, color: string, trapezoid: Trapezoid, nearLineWidth: number = 7, farLineWidth = 10, drawsCircles = true) {
  ctx.save();

  // まず白で枠を描く
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.setLineDash([]);
  ctx.lineWidth = farLineWidth;
  ctx.beginPath();
  trapezoidPath(ctx, trapezoid);
  ctx.stroke();

  // 指定された色で点線を描く
  ctx.strokeStyle = color;
  ctx.lineWidth = nearLineWidth;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  trapezoidPath(ctx, trapezoid);
  ctx.stroke();
  ctx.setLineDash([]);

  const drawCircle = (p: Vector) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], farLineWidth, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 四隅に円を書く
  if (drawsCircles) {
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    drawCircle(trapezoid.topLeft);
    drawCircle(trapezoid.topRight);
    drawCircle(trapezoid.bottomLeft);
    drawCircle(trapezoid.bottomRight);
  }

  ctx.restore();
}

export function calculateSheetRect(rect: Rect, minSize: Vector, ymargin: number, rscale: number): Rect {
  const r = extendRect(rect, SHEET_MARGIN * rscale);
  r[1] -= ymargin * rscale;
  r[3] += ymargin * rscale * 2;
  return ensureMinRectSize(scale2D(minSize, rscale), r);
}

export function drawSheet(ctx: CanvasRenderingContext2D, corners: Trapezoid, r: Rect, fillStyle: string) {
  const paperr = new paper.Rectangle(...r);
  const path1 = new paper.Path.Rectangle(paperr, [8, 8]);

  const path2 = new paper.Path();
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i === 0) {
      path2.moveTo(p as Vector);
    } else {
      path2.lineTo(p as Vector);
    }
  }
  path2.closed = true;

  const path3 = path1.subtract(path2);
  
  ctx.fillStyle = fillStyle;
  ctx.fill(new Path2D(path3.pathData));
}
