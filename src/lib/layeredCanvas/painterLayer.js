import { Layer } from "./layeredCanvas.js";
import * as paper from 'paper';

export class PainterLayer extends Layer {
  constructor() {
    super();
    this.image = new Image();
    this.currentPen = { strokeStyle: "black", lineWidth: 5 };
  }

  render(ctx) {
    const size = this.getPaperSize();

    ctx.drawImage(this.image, 0, 0, size[0], size[1]);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.path) {
      ctx.beginPath();
      const path = new Path2D(this.path.pathData);
      console.log("render", path);
      this.applyCurrentPen(ctx);
      ctx.stroke(path);
    }
  }

  accepts(point) {
    console.log("accepts", point);    
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
    const size = this.getPaperSize();

    const canvas = document.createElement('canvas');
    canvas.width = size[0];
    canvas.height = size[1];
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size[0], size[1]);

    ctx.drawImage(this.image, 0, 0, size[0], size[1]);

    ctx.strokeStyle = "black";
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.path) {
      ctx.beginPath();
      const path = new Path2D(this.path.pathData);
      this.applyCurrentPen(ctx);
      ctx.stroke(path);
    }

    this.image.src = canvas.toDataURL();
    await this.image.decode();
  }

  applyCurrentPen(ctx) {
    for (let key in this.currentPen) {
      ctx[key] = this.currentPen[key];
    }
  }
}