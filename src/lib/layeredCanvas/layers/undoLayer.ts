import { LayerBase } from "../system/layeredCanvas";
import type { Vector } from "../tools/geometry/geometry";

export class UndoLayer extends LayerBase {
  onUndo: () => void;
  onRedo: () => void;

  constructor(onUndo: ()=>void, onRedo: () => void) {
    super();
    this.onUndo = onUndo;
    this.onRedo = onRedo;
  }

  async keyDown(position_: Vector, event: KeyboardEvent): Promise<boolean> {
    if (event.code === "KeyZ") {
      if (event.ctrlKey && event.shiftKey) {
        this.onRedo();
        return true;
      } else if (event.ctrlKey) {
        this.onUndo();
        return true;
      }
    }
    return false;
  }
}
