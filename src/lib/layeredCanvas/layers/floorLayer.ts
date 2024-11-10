import { LayerBase, sequentializePointer, type Picked } from "../system/layeredCanvas";
import { keyDownFlags } from "../system/keyCache";
import type { Vector } from '../tools/geometry/geometry';
import type { Viewport } from "../system/layeredCanvas";
import type { FocusKeeper } from "../tools/focusKeeper";

export class FloorLayer extends LayerBase {
  viewport: Viewport;
  onViewportChanged: () => void; // ここで責任とれないこと（例えばsvelteUI)

  constructor(viewport: Viewport, onViewportChanged: () => void, private focusKeeper: FocusKeeper) {
    super();
    this.viewport = viewport;
    this.onViewportChanged = onViewportChanged;
  }

  wheel(_position: Vector, delta: number) {
    let scale = this.viewport.scale;
    scale -= delta * 0.0001;
    if (scale < 0.1) scale = 0.1;
    if (scale > 10) scale = 10;
    scale = Math.round(scale * 100) / 100;
    this.viewport.translate[0] *= scale / this.viewport.scale;
    this.viewport.translate[1] *= scale / this.viewport.scale;
    this.viewport.scale = scale;
    this.viewport.dirty = true;
    this.redraw();
    this.onViewportChanged();
    return true;
  }

  async keyDown(position_: Vector, event: KeyboardEvent): Promise<boolean> {
    //  if ESC
    if (event.code === "Escape") {
      this.focusKeeper.setFocus(null);
      return true;
    }
    return false;
  }

  accepts(_point: Vector, button: number, depth: number): any {
    if (0 < depth) return null;
    return keyDownFlags["Space"] || 0 < button;
  }

  *pointer(p: Vector) {
    const dragStart = p;
    const scale = this.viewport.scale;

    this.focusKeeper.setFocus(null);

    try {
      while (p = yield) {
        const dragOffset: Vector = [
          (p[0] - dragStart[0]) * scale,
          (p[1] - dragStart[1]) * scale
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
    this.onViewportChanged();
  }
}
sequentializePointer(FloorLayer);
