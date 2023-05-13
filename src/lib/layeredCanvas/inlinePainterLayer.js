import { reverse2D } from "./geometry.js";
import { Layer } from "./layeredCanvas.js";
import * as paper from 'paper';

export class InlinePainterLayer extends Layer {
  constructor() {
    super();
    this.currentPen = { strokeStyle: "black", lineWidth: 5 };
    this.image = null;
    this.translation = [0, 0];
    this.scale = [1,1];

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenContext = this.offscreenCanvas.getContext('2d');
  }

  render(ctx) {
    if (!this.image) {return;}

    const size = this.getPaperSize();

    // ctx.drawImage(this.offscreenCanvas, 0, 0, size[0], size[1]);

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
    console.log("setImage", translation, scale, [img.width, img.height], [img.naturalWidth, img.naturalHeight]);
    this.image = img;
    this.translation = translation;
    this.scale = scale;
    this.offscreenCanvas.width = img.naturalWidth;
    this.offscreenCanvas.height = img.naturalHeight;
    this.offscreenContext.drawImage(this.image, 0, 0, img.naturalWidth, img.naturalHeight);
    this.redraw();
  }
}