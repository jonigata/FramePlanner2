import { Layer } from "./layeredCanvas.js";
import * as paper from 'paper';
import { trapezoidBoundingRect } from "./trapezoid.js";
import { calculatePhysicalLayout, constraintLeaf, findLayoutOf } from './frameTree.js';

export class InlinePainterLayer extends Layer {
  constructor(frameLayer) {
    super();
    this.frameLayer = frameLayer;
    this.currentPen = { strokeStyle: "black", lineWidth: 5 };
    this.element = null;
    this.translation = [0, 0];
    this.scale = [1,1];
    this.maskPath = null;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenContext = this.offscreenCanvas.getContext('2d');
  }

  render(ctx) {
    if (!this.image) {return;}

    const size = this.getPaperSize();

    // ctx.drawImage(this.offscreenCanvas, 0, 0, size[0], size[1]);
    if (this.maskPath) {
      ctx.beginPath();
      ctx.fillStyle = "rgb(0, 0, 0, 0.5)";
      ctx.fill(new Path2D(this.maskPath.pathData));
    }


    if (this.path) {
      this.applyCurrentPen(ctx);
      ctx.stroke(new Path2D(this.path.pathData));
    }
  }

  accepts(point) {
    console.log("accepts", point);    
    if (!this.image) {return null;}
    return {};
  }

  async *pointer(q, payload) {
    console.log("pointer", q, payload);

    const path = new paper.Path();
    this.path = path;
    path.moveTo(q);
    path.closed = false;

    let p;
    while (p = yield) {
      path.lineTo(p);
      this.redraw();      
    }
    await this.snapshot();
    this.path = null;
    this.redraw();
  }

  async snapshot() {
    const size = [this.image.naturalWidth, this.image.naturalHeight];

    const canvas = this.offscreenCanvas;
    const ctx = this.offscreenContext;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size[0], size[1]);

    ctx.drawImage(this.image, 0, 0, size[0], size[1]);

    if (this.path) {
      ctx.save();
      console.log("snapshot", this.translation, this.scale, [this.image.naturalWidth, this.image.naturalHeight]);
      ctx.translate(this.image.naturalWidth * 0.5, this.image.naturalHeight * 0.5);
      ctx.scale(1/this.scale[0], 1/this.scale[1]);
      ctx.translate(-this.translation[0], -this.translation[1]);
      this.applyCurrentPen(ctx);
      ctx.stroke(new Path2D(this.path.pathData));
      ctx.restore();
    }

    this.image.src = canvas.toDataURL();
    await this.image.decode();
  }

  applyCurrentPen(ctx) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let key in this.currentPen) {
      ctx[key] = this.currentPen[key];
    }
  }

  setImage(img, translation, scale) {
    this.image = img;
    if (img) {
      console.log("setImage", translation, scale, [img.width, img.height], [img.naturalWidth, img.naturalHeight]);
      this.translation = translation;
      this.scale = scale;
      this.offscreenCanvas.width = img.naturalWidth;
      this.offscreenCanvas.height = img.naturalHeight;
      this.offscreenContext.drawImage(this.image, 0, 0, img.naturalWidth, img.naturalHeight);
    }
    this.redraw();
  }

  setElement(element) {
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
      constraintLeaf(layout);
      const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);
      const translation = [
        (x0 + x1) * 0.5 + element.translation[0], 
        (y0 + y1) * 0.5 + element.translation[1]
      ];
      const scale = [
        element.scale[0] * element.reverse[0],
        element.scale[1] * element.reverse[1]
      ];

      this.translation = translation;
      this.scale = scale;
      this.offscreenCanvas.width = img.naturalWidth;
      this.offscreenCanvas.height = img.naturalHeight;
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
    }
    this.redraw();
  }

  get image() {
    return this.element?.image;
  }
}