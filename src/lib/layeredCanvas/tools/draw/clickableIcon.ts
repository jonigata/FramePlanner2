import type { Vector, Rect } from "../geometry/geometry";

export class ClickableIcon {
  static tmpCanvas: HTMLCanvasElement;
  static tmpCtx: CanvasRenderingContext2D;

  images: HTMLImageElement[];
  position: Vector;
  size: Vector;
  pivot: Vector;
  hint: string;
  visibleConditionProvider: () => boolean;
  matrixProvider: () => DOMMatrix;
  index: number;
  
  constructor(srcs: string[], size: Vector, pivot: Vector, hint: string, visibleConditionProvider: () => boolean, matrixProvider: () => DOMMatrix) {
    this.images = srcs.map(src => {
        const image = new Image();
        image.src = new URL(`../../../../assets/${src}`, import.meta.url).href;
        return image;
    });
    this.position = [0,0];
    this.size = size;
    this.pivot = pivot;
    this.hint = hint;
    this.visibleConditionProvider = visibleConditionProvider;
    this.matrixProvider = matrixProvider;
    this.index = 0;
  }

  isVisible(): boolean {
    return !this.visibleConditionProvider || this.visibleConditionProvider();
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.isVisible()) return;
    this.renderImage(ctx, this.images[this.index], this.position, this.size, this.pivot);
  }

  contains(p: Vector): boolean {
    if (!this.isVisible()) return false;
    const [x, y, w, h] = this.boudingRect();
    const f = x <= p[0] && p[0] <= x + w && y <= p[1] && p[1] <= y + h;
    return f;
  }

  hintIfContains(point: Vector, f: (v: Vector, h: string) => void): boolean {
    if (this.contains(point)) {
      const [x, y, w, h] = this.boudingRect();
      const hintPosition: Vector = [x + w / 2, y + h / 2 - 32];
  
      f(hintPosition, this.hint);
      return true;
    }
    return false;
  }

  doItIfContains(point: Vector, f: (v: Vector) => void): boolean {
    if (this.contains(point)) {
      f(point);
      return true;
    }
    return false;
  }

  increment(): void {
    this.index = (this.index + 1) % this.images.length;
  }

  reset(): void {
    this.index = 0;
  }

  renderImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, position: Vector, size: Vector, pivot: Vector) {
    if (image.width === 0 || image.height === 0) return;
    if (!ClickableIcon.tmpCanvas) {
      ClickableIcon.tmpCanvas = document.createElement("canvas");
      ClickableIcon.tmpCtx = ClickableIcon.tmpCanvas.getContext("2d");
    }
    ClickableIcon.tmpCanvas.width = image.width;
    ClickableIcon.tmpCanvas.height = image.height;
    ClickableIcon.tmpCtx.drawImage(image, 0, 0);

    ctx.save();
    const [x, y, w, h] = this.boudingRect();
    ctx.shadowColor = '#404040';
    ctx.shadowBlur = 3;
    ctx.drawImage(ClickableIcon.tmpCanvas, x, y, w, h);
    ctx.restore();
  }

  boudingRect(): Rect {
    const rscale = this.rscale;
    let [x, y] = this.position;
    x -= this.pivot[0] * this.size[0] * rscale;
    y -= this.pivot[1] * this.size[1] * rscale;
    const [w, h] = [this.size[0] * rscale, this.size[1] * rscale];
    return [x, y, w, h];
  }

  center(): Vector {
    const [x, y, w, h] = this.boudingRect();
    return [x + w / 2, y + h / 2];
  }

  get rscale(): number {
    return 1 / this.matrixProvider().a;
  }

  static calcPosition(rect: Rect, unit: Vector, regularizedOrigin: Vector, offsetUnit: Vector): Vector {
    const [x, y, w, h] = rect;
    const origin = [x + w * regularizedOrigin[0], y + h * regularizedOrigin[1]];
    return [origin[0] + unit[0] * offsetUnit[0], origin[1] + unit[1] * offsetUnit[1]];
  }
}