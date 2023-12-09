import { Layer, sequentializePointer } from "../system/layeredCanvas.js";
import { keyDownFlags } from "../system/keyCache.js";
import type { Vector } from '../tools/geometry/geometry.js';

export class FloorLayer extends Layer {
  onChange: (scale: number) => void;

  constructor(onChange: (scale: number) => void) {
    super();
    this.onChange = onChange;
  }

  wheel(delta: number) {
    console.log("FloorLayer wheel", delta);
    let scale = this.canvas.paper.scale[0];
    scale -= delta * 0.0001;
    if (scale < 0.1) scale = 0.1;
    if (scale > 10) scale = 10;
    scale = Math.round(scale * 100) / 100;
    this.canvas.paper.scale = [scale, scale];
    this.redraw();
    this.onChange(scale);
    return true;
  }

  accepts(_point: Vector): boolean {
    return keyDownFlags["Space"];
  }

  *pointer(p: Vector) {
    const dragStart = p;
    const scale = this.canvas.paper.scale;

    try {
      while (p = yield) {
        const dragOffset: Vector = [
          (p[0] - dragStart[0]) * scale[0],
          (p[1] - dragStart[1]) * scale[1]
        ];
        this.canvas.paper.viewTranslate = dragOffset;
        this.redraw();
      }
    }
    catch(e) {
      if (e === 'cancel') {
      } else {
        throw e;
      }
    }
    const t = this.canvas.paper.translate;
    const v = this.canvas.paper.viewTranslate;
    this.canvas.paper.translate = [t[0] + v[0], t[1] + v[1]];
    this.canvas.paper.viewTranslate = [0, 0];
  }

}
sequentializePointer(FloorLayer);
