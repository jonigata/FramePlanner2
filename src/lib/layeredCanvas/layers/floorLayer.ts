import { Layer, sequentializePointer } from "../system/layeredCanvas.js";
import { keyDownFlags } from "../system/keyCache.js";
import type { Vector } from '../tools/geometry/geometry.js';

export class FloorLayer extends Layer {
  onChange: (scale: number) => void;

  constructor(onChange: (scale: number) => void) {
    super();
    this.onChange = onChange;
  }

  wheel(_position: Vector, delta: number) {
    console.log("FloorLayer wheel", delta);
    let scale = this.paper.viewport.scale[0];
    scale -= delta * 0.0001;
    if (scale < 0.1) scale = 0.1;
    if (scale > 10) scale = 10;
    scale = Math.round(scale * 100) / 100;
    this.paper.viewport.scale = [scale, scale];
    this.redraw();
    this.onChange(scale);
    return true;
  }

  accepts(_point: Vector): boolean {
    return keyDownFlags["Space"];
  }

  *pointer(p: Vector) {
    const dragStart = p;
    const scale = this.paper.viewport.scale;

    try {
      while (p = yield) {
        const dragOffset: Vector = [
          (p[0] - dragStart[0]) * scale[0],
          (p[1] - dragStart[1]) * scale[1]
        ];
        this.paper.viewport.viewTranslate = dragOffset;
        this.redraw();
      }
    }
    catch(e) {
      if (e === 'cancel') {
      } else {
        throw e;
      }
    }
    const t = this.paper.viewport.translate;
    const v = this.paper.viewport.viewTranslate;
    this.paper.viewport.translate = [t[0] + v[0], t[1] + v[1]];
    this.paper.viewport.viewTranslate = [0, 0];
  }

}
sequentializePointer(FloorLayer);
