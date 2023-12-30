import { Layer, sequentializePointer } from "../system/layeredCanvas";
import { keyDownFlags } from "../system/keyCache";
import type { Vector } from '../tools/geometry/geometry';
import type { Viewport } from "../system/layeredCanvas";

export class FloorLayer extends Layer {
  viewport: Viewport;

  constructor(viewport: Viewport) {
    super();
    this.viewport = viewport;
  }

  wheel(_position: Vector, delta: number) {
    console.log("FloorLayer wheel", delta);
    let scale = this.viewport.scale[0];
    scale -= delta * 0.0001;
    if (scale < 0.1) scale = 0.1;
    if (scale > 10) scale = 10;
    scale = Math.round(scale * 100) / 100;
    this.viewport.scale = [scale, scale];
    this.viewport.dirty = true;
    this.redraw();
    return true;
  }

  accepts(_point: Vector): boolean {
    return keyDownFlags["Space"];
  }

  *pointer(p: Vector) {
    const dragStart = p;
    const scale = this.viewport.scale;

    try {
      while (p = yield) {
        const dragOffset: Vector = [
          (p[0] - dragStart[0]) * scale[0],
          (p[1] - dragStart[1]) * scale[1]
        ];
        this.viewport.viewTranslate = dragOffset;
        this.viewport.dirty = true;
        this.redraw();
      }
    }
    catch(e) {
      if (e === 'cancel') {
      } else {
        throw e;
      }
    }
    const t = this.viewport.translate;
    const v = this.viewport.viewTranslate;
    this.viewport.translate = [t[0] + v[0], t[1] + v[1]];
    this.viewport.viewTranslate = [0, 0];
    this.viewport.dirty = true;
  }

}
sequentializePointer(FloorLayer);
