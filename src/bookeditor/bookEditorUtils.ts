import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
import { toolTipRequest } from '../utils/passiveToolTipStore';

export function hint(
  canvas: HTMLCanvasElement,
  p: [number, number, number, number] | null,
  s: string | null
) {
  if (p === null || s === null) {
    toolTipRequest.set(null);
  } else {
    const q0 = convertPointFromNodeToPage(canvas, p[0], p[1]);
    toolTipRequest.set({
      message: s,
      rect: { left: q0.x, top: q0.y, width: p[2], height: p[3] }
    });
  }
}
