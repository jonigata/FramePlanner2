import type { Vector } from './geometry/geometry';

export function *translate(p: Vector, f: (t: Vector) => void) {
  let dragStart = p;

  while (p = yield) {
    const dragOffset: Vector = [p[0] - dragStart[0], p[1] - dragStart[1]];
    f(dragOffset);
  }
}

export function *scale([w, h]: Vector, p: Vector, f: (s: Vector) => void) {
  let dragStart = p;

  while (p = yield) {
    const dragOffset = [p[0] - dragStart[0], p[1] - dragStart[1]];
    let xScale = 1 + dragOffset[0] / w;
    let yScale = 1 + dragOffset[0] / h;
    f([xScale, yScale]);
  }
}

export function *rotate(p: Vector, f: (r: number) => void) {
  let dragStart = p;

  while (p = yield) {
    const dragOffset = p[0] - dragStart[0];
    f(dragOffset);
  }
}
