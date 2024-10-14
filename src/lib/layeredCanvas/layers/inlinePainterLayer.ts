import { LayerBase, sequentializePointer } from "../system/layeredCanvas";
import type { Film } from '../dataModels/film';
import { ImageMedia } from '../dataModels/media';
import type { Vector } from "../tools/geometry/geometry";
import { type Trapezoid, trapezoidBoundingRect } from "../tools/geometry/trapezoid";
import type { FrameLayer } from "./frameLayer";
import { drawSelectionFrame } from "../tools/draw/selectionFrame";
import * as paper from 'paper';
import { getStroke } from 'perfect-freehand'

export class InlinePainterLayer extends LayerBase {
  frameLayer: FrameLayer;

  film: Film | null = null;
  surfaceCorners: Trapezoid | null = null;
  depth: number | null = null;
  translation: Vector;
  scale: Vector;
  maskPath: paper.PathItem | null;
  history: HTMLCanvasElement[];
  historyIndex: number;
  onAutoGenerate: () => void;


  drawsBackground: boolean;
  // path: paper.Path;
  path: Path2D | null = null;
  strokeOptions: any; // perfect-freehandのオプション

  constructor(frameLayer: FrameLayer, onAutoGenerate: () => void) {
    super();
    this.frameLayer = frameLayer;

    this.translation = [0, 0];
    this.scale = [1,1];
    this.maskPath = null;
    this.history = [];
    this.historyIndex = 0;
    this.onAutoGenerate = onAutoGenerate;
    this.drawsBackground = false;
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.canvas) {return;}
    if (depth !== this.depth) { return; }

    this.drawFilmFrame(ctx);
    drawSelectionFrame(ctx, "rgba(0, 128, 255, 1)", this.surfaceCorners!);

    if (this.maskPath) {
      ctx.beginPath();
      ctx.fillStyle = "rgb(0, 0, 0, 0.5)";
      ctx.fill(new Path2D(this.maskPath.pathData));
    }

    if (this.path) {
      ctx.save();
      this.applyBrush(ctx);
      this.drawPath(ctx);
      ctx.restore();
    }
  }

  accepts(_point: Vector, _button: number, depth: number): any {
    if (0 < depth) { return null; }
    if (!this.canvas) {return null;}
    return {};
  }

  async *pointer(q: Vector, payload: any): AsyncGenerator<void, void, Vector> {
    const rawStroke: Vector[] = [];

    let p: Vector;
    while (p = yield) {
      rawStroke.push(p);

      const stroke: Vector[] = getStroke(rawStroke, this.strokeOptions) as Vector[];

      this.path = new Path2D();
      this.path.moveTo(...stroke[0]);
      for (let i = 1; i < stroke.length; i++) {
        this.path.lineTo(...stroke[i]);
      }
      this.path.closePath();

      this.redraw();      
    }
    this.snapshot();
    this.path = null;
    this.redraw();
    this.onAutoGenerate();
  }

  snapshot(): void {
    const [w, h] = [this.canvas!.width, this.canvas!.height];
    console.log("snapshot", [w,h]);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.history[this.historyIndex-1], 0, 0);

    if (this.path) {
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      ctx.rotate(this.film!.rotation * Math.PI / 180);
      ctx.scale(1/this.scale[0], 1/this.scale[1]);
      ctx.translate(-this.translation[0], -this.translation[1]);
      this.applyBrush(ctx);
      this.drawPath(ctx);
      ctx.restore();
    }

    const ctx2 = this.canvas!.getContext('2d')!;
    ctx2.clearRect(0, 0, w, h);
    ctx2.drawImage(canvas, 0, 0, w, h);

    const dataUrl = canvas.toDataURL();
    this.history.length = this.historyIndex;
    this.history.push(canvas);
    this.historyIndex++;
    console.log("snapshot", this.historyIndex, this.history.length);
  }

  setSurface(film: Film | null, trapezoid: Trapezoid | null, depth: number): void {
    this.film = film;
    this.surfaceCorners = trapezoid;
    this.depth = depth;
    this.maskPath = null;
    if (film == null) { 
      this.redraw();
      return; 
    }

    const paperSize = this.frameLayer.getPaperSize();

    const [x0, y0, w, h] = trapezoidBoundingRect(trapezoid!);
    const filmTranslation = film.getShiftedTranslation(paperSize);
    const filmScale = film.getShiftedScale(paperSize);
    const translation: Vector = [
      x0 + w * 0.5 + filmTranslation[0], 
      y0 + h * 0.5 + filmTranslation[1]
    ];
    const scale: Vector = [
      filmScale * film.reverse[0],
      filmScale * film.reverse[1]
    ];

    const [iw, ih] = [film.media.naturalWidth, film.media.naturalHeight];

    this.translation = translation;
    this.scale = scale;
    console.log("setSurface", translation, scale, [iw, ih]);

    const windowPath = new paper.Path();
    windowPath.moveTo(trapezoid!.topLeft);
    windowPath.lineTo(trapezoid!.topRight);
    windowPath.lineTo(trapezoid!.bottomRight);
    windowPath.lineTo(trapezoid!.bottomLeft);
    windowPath.closed = true;

    const paperPath = new paper.CompoundPath({children: [new paper.Path.Rectangle([0,0], this.getPaperSize())]});
    this.maskPath = paperPath.subtract(windowPath);
    // this.maskPath = paperPath;
    console.log(this.maskPath.pathData);

    const canvas = document.createElement('canvas');
    canvas.width = iw;
    canvas.height = ih;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(film.media.drawSource, 0, 0);

    this.history=[canvas];
    this.historyIndex = 1;
    this.redraw();
  }

  get canvas(): HTMLCanvasElement | null{
    if (!this.film) { return null; }
    const media = this.film.media;
    if (!(media instanceof ImageMedia)) {
      return null;
    }
    return media.canvas;
  }

  async undo() {
    console.log("inlinePainterLayer.undo", this.historyIndex, this.history.length)
    if (this.historyIndex <= 1) { return; }

    this.historyIndex--;
    const prevCanvas = this.history[this.historyIndex - 1];
    const ctx = this.canvas!.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    ctx.drawImage(prevCanvas, 0, 0);
    this.redraw();
  }

  async redo() {
    console.log("inlinePainterLayer.redo", this.historyIndex, this.history.length)
    if (this.history.length <= this.historyIndex) { return; }

    this.historyIndex++;
    const nextCanvas = this.history[this.historyIndex - 1];
    const ctx = this.canvas!.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    ctx.drawImage(nextCanvas, 0, 0);
    this.redraw();
  }

  // paperRenderLayerからコピペ
  drawFilmFrame(ctx: CanvasRenderingContext2D): void {
    const [w, h] = [this.canvas!.width, this.canvas!.height];

    ctx.save();
    ctx.translate(this.translation[0], this.translation[1]);
    ctx.scale(this.scale[0], this.scale[1]);
    ctx.rotate(-this.film!.rotation * Math.PI / 180);
    ctx.translate(-w * 0.5, -h * 0.5);
    ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }

  applyBrush(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.strokeOptions.fill;
    ctx.strokeStyle = this.strokeOptions.stroke;
    ctx.lineWidth = this.strokeOptions.strokeWidth;
  }

  drawPath(ctx: CanvasRenderingContext2D) {
    if (this.strokeOptions.strokeOperation == 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(this.path!);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      if (0 < this.strokeOptions.strokeWidth) {
        ctx.lineJoin = "round";
        ctx.stroke(this.path!);
      }
      if (this.strokeOptions.strokeOperation == 'strokeWithFill') {
        ctx.fill(this.path!);
      }
    }
  }

  renderDepths(): number[] { return [0]; }

}
sequentializePointer(InlinePainterLayer);
