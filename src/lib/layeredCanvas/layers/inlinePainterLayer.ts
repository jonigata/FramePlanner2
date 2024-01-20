import { Layer, sequentializePointer } from "../system/layeredCanvas";
import { type FrameElement, type Layout, calculatePhysicalLayout, constraintLeaf, findLayoutOf } from '../dataModels/frameTree';
import type { Vector } from "../tools/geometry/geometry";
import { trapezoidBoundingRect } from "../tools/geometry/trapezoid";
import type { FrameLayer } from "./frameLayer";
import * as paper from 'paper';

export class InlinePainterLayer extends Layer {
  frameLayer: FrameLayer;

  currentBrush: { strokeStyle: string, lineWidth: number };
  element: FrameElement;
  translation: Vector;
  scale: Vector;
  maskPath: paper.PathItem;
  history: string[];
  historyIndex: number;
  onAutoGenerate: () => void;
  layout: Layout;
  drawsBackground: boolean;
  offscreenCanvas: HTMLCanvasElement;
  offscreenContext: CanvasRenderingContext2D;
  path: paper.Path;
  paperLayout: Layout;

  constructor(frameLayer: FrameLayer, onAutoGenerate: () => void) {
    super();
    this.frameLayer = frameLayer;

    this.currentBrush = { strokeStyle: "black", lineWidth: 5 };
    this.element = null;
    this.translation = [0, 0];
    this.scale = [1,1];
    this.maskPath = null;
    this.history = [];
    this.historyIndex = 0;
    this.onAutoGenerate = onAutoGenerate;
    this.layout = null;
    this.drawsBackground = false;
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.image) {return;}
    if (depth !== 0) { return; }

    this.drawImage(ctx, this.layout)
    // ctx.drawImage(this.image, 0, 0);

    if (this.maskPath) {
      ctx.beginPath();
      ctx.fillStyle = "rgb(0, 0, 0, 0.5)";
      ctx.fill(new Path2D(this.maskPath.pathData));
    }


    if (this.path) {
      this.applyCurrentBrush(ctx);
      ctx.stroke(new Path2D(this.path.pathData));
    }
  }

  accepts(_point: Vector): any {
    if (!this.image) {return null;}
    return {};
  }

  async *pointer(q: Vector, payload: any): AsyncGenerator<Vector, void, Vector> {
    console.log("pointer", q, payload);

    const path = new paper.Path();
    this.path = path;
    path.moveTo(q);
    path.closed = false;

    let p: Vector;
    while (p = yield) {
      path.lineTo(p);
      this.redraw();      
    }
    await this.snapshot();
    this.path = null;
    this.redraw();
    this.onAutoGenerate();
  }

  async snapshot(): Promise<void> {
    const [w, h] = [this.image.naturalWidth, this.image.naturalHeight];

    const canvas = this.offscreenCanvas;
    const ctx = this.offscreenContext;

    if (this.path) {
      ctx.save();
      console.log("snapshot", this.translation, this.scale, [w, h]);
      ctx.translate(w * 0.5, h * 0.5);
      ctx.scale(1/this.scale[0], 1/this.scale[1]);
      ctx.translate(-this.translation[0], -this.translation[1]);
      this.applyCurrentBrush(ctx);
      ctx.stroke(new Path2D(this.path.pathData));
      ctx.restore();
    }

    this.image.src = canvas.toDataURL();
    this.history.length = this.historyIndex;
    this.history.push(this.image.src);
    this.historyIndex++;
    console.log("snapshot", this.historyIndex, this.history.length);
    await this.image.decode();
  }

  applyCurrentBrush(ctx: CanvasRenderingContext2D): void {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let key in this.currentBrush) {
      ctx[key] = this.currentBrush[key];
    }
  }

  setElement(element: FrameElement): void {
    if (this.element) {
      this.element.focused = false;
    }
    this.element = element;
    this.maskPath = null;

    const img = this.image;
    if (img) {
      this.element.focused = true;
      console.log("setElement");

      this.paperLayout = calculatePhysicalLayout(this.frameLayer.frameTree, this.frameLayer.getPaperSize(), [0,0]);
      const layout = findLayoutOf(this.paperLayout, element);
      this.layout = layout;
      constraintLeaf(layout);
      const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);
      const translation: Vector = [
        (x0 + x1) * 0.5 + element.translation[0], 
        (y0 + y1) * 0.5 + element.translation[1]
      ];
      const scale: Vector = [
        element.scale[0] * element.reverse[0],
        element.scale[1] * element.reverse[1]
      ];

      this.translation = translation;
      this.scale = scale;
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = img.naturalWidth;
      this.offscreenCanvas.height = img.naturalHeight;
      this.offscreenContext = this.offscreenCanvas.getContext('2d');
      this.offscreenContext.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      const windowPath = new paper.Path();
      windowPath.moveTo(layout.corners.topLeft);
      windowPath.lineTo(layout.corners.topRight);
      windowPath.lineTo(layout.corners.bottomRight);
      windowPath.lineTo(layout.corners.bottomLeft);
      windowPath.closed = true;

      const paperPath = new paper.CompoundPath({children: [new paper.Path.Rectangle([0,0], this.getPaperSize())]});
      this.maskPath = paperPath.subtract(windowPath);
      // this.maskPath = paperPath;
      console.log(this.maskPath.pathData);
      this.history=[this.image.src];
      this.historyIndex = 1;
    }
    this.redraw();
  }

  get image(): HTMLImageElement {
    return this.element?.scribble;
  }

  undo(): void {
    console.log("inlinePainterLayer.undo", this.historyIndex, this.history.length)
    if (this.historyIndex <= 1) { return; }

    this.historyIndex--;
    this.image.src = this.history[this.historyIndex - 1];
    this.redraw();
    this.onAutoGenerate();
  }

  redo(): void {
    console.log("inlinePainterLayer.redo", this.historyIndex, this.history.length)
    if (this.history.length <= this.historyIndex) { return; }

    this.historyIndex++;
    this.image.src = this.history[this.historyIndex - 1];
    this.redraw();
    this.onAutoGenerate();
  }

  // paperRenderLayerからコピペ
  drawImage(ctx: CanvasRenderingContext2D, layout: Layout): void {
    const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);
    const [w, h] = [this.image.naturalWidth, this.image.naturalHeight];

    ctx.save();
    ctx.translate(this.translation[0], this.translation[1]);
    ctx.scale(this.scale[0], this.scale[1]);
    ctx.translate(-w * 0.5, -h * 0.5);
    ctx.globalAlpha = 0.4;
    if (this.drawsBackground) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1.0;
    ctx.drawImage(this.image, 0, 0, w, h);
    ctx.restore();
  }

  renderDepths(): number[] { return [0]; }

}
sequentializePointer(InlinePainterLayer);
