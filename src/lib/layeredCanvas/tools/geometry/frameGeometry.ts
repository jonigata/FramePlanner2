import type { Barriers } from '../../dataModels/film';
import { type Vector, offsetLine } from '../geometry/geometry';
import type { Trapezoid } from '../geometry/trapezoid';
import { clipPolygonByLine } from '../geometry/clipPolygonByLine';

export function makeFrameClip(trapezoid: Trapezoid, paperSize: Vector, barriers: Barriers, offset: number): Vector[] {
  const [w, h] = paperSize;
  let polygon: Vector[] = [[0, 0], [w, 0], [w, h], [0, h]];
  if (barriers.top) {
    const line = offsetLine(trapezoid.topLeft, trapezoid.topRight, -offset);
    polygon = clipPolygonByLine(polygon, ...line);
  }
  if (barriers.right) {
    const line = offsetLine(trapezoid.topRight, trapezoid.bottomRight, -offset);
    polygon = clipPolygonByLine(polygon, ...line);
  }
  if (barriers.bottom) {
    const line = offsetLine(trapezoid.bottomRight, trapezoid.bottomLeft, -offset);
    polygon = clipPolygonByLine(polygon, ...line);
  }
  if (barriers.left) {
    const line = offsetLine(trapezoid.bottomLeft, trapezoid.topLeft, -offset);
    polygon = clipPolygonByLine(polygon, ...line);
  }
  return polygon;
}
