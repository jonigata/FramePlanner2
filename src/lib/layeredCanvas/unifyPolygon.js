/*
import Flatten from '@flatten-js/core'
import BooleanOperations from "@flatten-js/boolean-op"
const {Point, Vector, Circle, Line, Ray, Segment, Arc, Box, Polygon, Matrix, PlanarSet} = Flatten;
const {segment, circle, point} = Flatten;
const { unify } = BooleanOperations;

    // make some construction
export function unifyPolygon(path2d1, path2d2) {
  const p1 = pathToPolygon(path2d1, 100);
  const p2 = pathToPolygon(path2d2, 100);
  const p3 = unify(p1, p2);

  return p3;
}
*/
import { union,intersect,difference } from '../../improved-greiner-hormann/src/index.js'; // 多分名前間違えてる

export function unifyPolygon(path2d1, path2d2) {
  const u = difference(pathToPolygon(path2d1, 100), pathToPolygon(path2d2, 100));
  return u[0];
}

function pathToPolygon(path, n) {
  const points = [];
  const length = path.getTotalLength();
  for (let i = 0; i < n; i++) {
    const p = path.getPointAtLength((i / n) * length);
    points.push({x:p.x, y:p.y});
  }
  points.push(points[0]);
  return points;
}
    
    