import { Layer, sequentializePointer } from "../system/layeredCanvas";
import { type FrameElement, type Layout, Media, ImageMedia, calculatePhysicalLayout, findLayoutOf, Film } from '../dataModels/frameTree';
import type { Vector } from "../tools/geometry/geometry";
import { type Trapezoid, trapezoidBoundingRect } from "../tools/geometry/trapezoid";
import type { FrameLayer } from "./frameLayer";
import { drawSelectionFrame } from "../tools/draw/selectionFrame";
import * as paper from 'paper';
import { getStroke } from 'perfect-freehand'

export class InlinePainterLayer extends Layer {
  frameLayer: FrameLayer;

  element: FrameElement;
  film: Film;
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
  // path: paper.Path;
  paperLayout: Layout;
  path: Path2D;
  strokeOptions: any; // perfect-freehandのオプション

  constructor(frameLayer: FrameLayer, onAutoGenerate: () => void) {
    super();
    this.frameLayer = frameLayer;

    this.element = null;
    this.translation = [0, 0];
    this.scale = [1,1];
    this.maskPath = null;
    this.history = [];
    this.historyIndex = 0;
    this.onAutoGenerate = onAutoGenerate;
    this.layout = null;
    this.drawsBackground = false;

    this.strokeOptions = {
      size: 8,  
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: t => t,
      simulatePressure: true,
      last: true,
      start: {
        cap: true,
        taper: 0,
        easing: t => t,
      },
      end: {
        cap: true,
        taper: 0,
        easing: t => t,
      },

      strokeWidth: 0,
      isFilled: true,
      fill: "#000000",
      stroke: "#000000",
    }; // TODO: FreehandInspectorと重複している
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    if (!this.image) {return;}
    if (depth !== 0) { return; }

    this.drawFilmFrame(ctx);
    drawSelectionFrame(ctx, "rgba(0, 128, 255, 1)", this.layout.corners);

    if (this.maskPath) {
      ctx.beginPath();
      ctx.fillStyle = "rgb(0, 0, 0, 0.5)";
      ctx.fill(new Path2D(this.maskPath.pathData));
    }

    if (this.path) {
      this.applyBrush(ctx);
      if (0 < this.strokeOptions.strokeWidth) {
        ctx.lineJoin = "round";
        ctx.stroke(this.path);
      }
      if (this.strokeOptions.isFilled) {
        ctx.fill(this.path);
      }
    }
  }

  accepts(_point: Vector): any {
    if (!this.image) {return null;}
    return {};
  }

  async *pointer(q: Vector, payload: any): AsyncGenerator<Vector, void, Vector> {
    console.log("pointer", q, payload);

    const rawStroke: Vector[] = [];

    console.log(this.strokeOptions);

    let p: Vector;
    while (p = yield) {
      rawStroke.push(p);

      const stroke: Vector[] = getStroke(rawStroke, this.strokeOptions) as Vector[];
      console.log(stroke);

      this.path = new Path2D();
      this.path.moveTo(...stroke[0]);
      for (let i = 1; i < stroke.length; i++) {
        this.path.lineTo(...stroke[i]);
      }
      this.path.closePath();

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
      ctx.rotate(this.film.rotation * Math.PI / 180);
      ctx.scale(1/this.scale[0], 1/this.scale[1]);
      ctx.translate(-this.translation[0], -this.translation[1]);
      this.applyBrush(ctx);
      if (0 < this.strokeOptions.strokeWidth) {
        ctx.lineJoin = "round";
        ctx.stroke(this.path);
      }
      if (this.strokeOptions.isFilled) {
        ctx.fill(this.path);
      }
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL();
    this.image.src = dataUrl;
    this.history.length = this.historyIndex;
    this.history.push(dataUrl);
    this.historyIndex++;
    console.log("snapshot", this.historyIndex, this.history.length);
    await this.image.decode();
  }

  setFilm(element: FrameElement, film: Film): void {
    if (this.element) {
      this.element.focused = false;
    }
    this.element = element;
    this.film = film;
    this.maskPath = null;
    if (element == null) { 
      this.film = null;
      this.redraw();
      return; 
    }

    this.element.focused = true;

    const paperSize = this.frameLayer.getPaperSize();
    this.paperLayout = calculatePhysicalLayout(this.frameLayer.frameTree, paperSize, [0,0]);
    const layout = findLayoutOf(this.paperLayout, element);
    this.layout = layout;

    const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
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
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = iw;
    this.offscreenCanvas.height = ih;
    this.offscreenContext = this.offscreenCanvas.getContext('2d');
    this.offscreenContext.drawImage(film.media.drawSource, 0, 0, iw, ih);

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
    this.redraw();
  }

  get image(): HTMLImageElement {
    if (!this.film) { return null; }
    const media = this.film.media;
    if (!(media instanceof ImageMedia)) {
      return null;
    }
    return media.image;
  }

  async undo() {
    console.log("inlinePainterLayer.undo", this.historyIndex, this.history.length)
    if (this.historyIndex <= 1) { return; }

    this.historyIndex--;
    this.image.src = this.history[this.historyIndex - 1];
    await this.image.decode();
    this.offscreenContext.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenContext.drawImage(this.image, 0, 0, this.image.naturalWidth, this.image.naturalHeight);
    this.redraw();
  }

  async redo() {
    console.log("inlinePainterLayer.redo", this.historyIndex, this.history.length)
    if (this.history.length <= this.historyIndex) { return; }

    this.historyIndex++;
    this.image.src = this.history[this.historyIndex - 1];
    await this.image.decode();
    this.offscreenContext.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.offscreenContext.drawImage(this.image, 0, 0, this.image.naturalWidth, this.image.naturalHeight);
    this.redraw();
  }

  // paperRenderLayerからコピペ
  drawFilmFrame(ctx: CanvasRenderingContext2D): void {
    const [w, h] = [this.image.naturalWidth, this.image.naturalHeight];

    ctx.save();
    ctx.translate(this.translation[0], this.translation[1]);
    ctx.scale(this.scale[0], this.scale[1]);
    ctx.rotate(-this.film.rotation * Math.PI / 180);
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

  renderDepths(): number[] { return [0]; }

}
sequentializePointer(InlinePainterLayer);
