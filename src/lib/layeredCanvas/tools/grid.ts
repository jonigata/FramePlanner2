import { type Vector, type Rect, extendRect } from './geometry/geometry';

export class Grid {
  rect: Rect;

  constructor(rect: Rect, margin: number, private cellUnit: Vector) {
    this.rect = extendRect(rect, margin);
  }

  calcPosition(regularizedOrigin: Vector, offsetUnit: Vector): Vector {
    const unit = this.cellUnit;
    const [x, y, w, h] = this.rect;
    const origin = [x + w * regularizedOrigin[0], y + h * regularizedOrigin[1]];
    return [origin[0] + unit[0] * offsetUnit[0], origin[1] + unit[1] * offsetUnit[1]];
  }
}
