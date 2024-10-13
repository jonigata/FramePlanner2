import type { Vector, Rect } from "../geometry/geometry";

export interface ClickableSlate {
  render(ctx: CanvasRenderingContext2D): void;
}

export abstract class ClickableSlate implements ClickableSlate {
  position: Vector;
  size: Vector;
  pivot: Vector;
  hint: string;
  visibleConditionProvider: (() => boolean) | null;
  matrixProvider: () => DOMMatrix;
  marginLeft = 0;
  marginTop = 0;
  marginRight = 0;
  marginBottom = 0;
  
  constructor(size: Vector, pivot: Vector, hint: string, visibleConditionProvider: (() => boolean) | null, matrixProvider: () => DOMMatrix) {
    this.position = [0,0];
    this.size = size;
    this.pivot = pivot;
    this.hint = hint;
    this.visibleConditionProvider = visibleConditionProvider;
    this.matrixProvider = matrixProvider;
  }

  isVisible(): boolean {
    return this.visibleConditionProvider == null || this.visibleConditionProvider();
  }

  contains(p: Vector): boolean {
    if (!this.isVisible()) return false;
    let [x, y, w, h] = this.boundingRect;
    x -= this.marginLeft;
    y -= this.marginTop;
    w += this.marginLeft + this.marginRight;
    h += this.marginTop + this.marginBottom;
    const f = x <= p[0] && p[0] <= x + w && y <= p[1] && p[1] <= y + h;
    return f;
  }

  hintIfContains(point: Vector, f: (r: Rect, h: string) => void): boolean {
    if (this.contains(point)) {
      f(this.boundingRect, this.hint);
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

  get boundingRect(): Rect {
    const rscale = this.rscale;
    let [x, y] = this.position;
    x -= this.pivot[0] * this.size[0] * rscale;
    y -= this.pivot[1] * this.size[1] * rscale;
    const [w, h] = [this.size[0] * rscale, this.size[1] * rscale];
    return [x, y, w, h];
  }

  get center(): Vector {
    const [x, y, w, h] = this.boundingRect;
    return [x + w / 2, y + h / 2];
  }

  get rscale(): number {
    // return Math.min(1 / this.matrixProvider().a, 3);
    return 1 / this.matrixProvider().a;
  }

  static calcPosition(rect: Rect, unit: Vector, regularizedOrigin: Vector, offsetUnit: Vector): Vector {
    const [x, y, w, h] = rect;
    const origin = [x + w * regularizedOrigin[0], y + h * regularizedOrigin[1]];
    return [origin[0] + unit[0] * offsetUnit[0], origin[1] + unit[1] * offsetUnit[1]];
  }
}

export class ClickableIcon extends ClickableSlate {
  static tmpCanvas: HTMLCanvasElement;
  static tmpCtx: CanvasRenderingContext2D;

  images: HTMLImageElement[];
  index: number;
  shadowColor: string;
  
  constructor(srcs: string[], size: Vector, pivot: Vector, hint: string, visibleConditionProvider: (() => boolean) | null, matrixProvider: () => DOMMatrix) {
    super(size, pivot, hint, visibleConditionProvider, matrixProvider);
    this.images = srcs.map(src => {
      const image = new Image();
      image.src = new URL(`../../../../assets/${src}`, import.meta.url).href;
      return image;
    });
    this.index = 0;
    this.shadowColor = '#ffffff';
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.isVisible()) return;
    this.renderImage(ctx, this.images[this.index]);
  }

  increment(): void {
    this.index = (this.index + 1) % this.images.length;
  }

  reset(): void {
    this.index = 0;
  }

  renderImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
    if (image.width === 0 || image.height === 0) return;
    if (!ClickableIcon.tmpCanvas) {
      ClickableIcon.tmpCanvas = document.createElement("canvas");
      ClickableIcon.tmpCtx = ClickableIcon.tmpCanvas.getContext("2d")!!;
    }
    ClickableIcon.tmpCanvas.width = image.width;
    ClickableIcon.tmpCanvas.height = image.height;
    ClickableIcon.tmpCtx.drawImage(image, 0, 0);

    ctx.save();
    const [x, y, w, h] = this.boundingRect;
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = 10;
    ctx.drawImage(ClickableIcon.tmpCanvas, x, y, w, h);
    ctx.restore();
  }
}

export class ClickableSelfRenderer extends ClickableSlate {
  renderFunction: (ctx: CanvasRenderingContext2D, csr: ClickableSelfRenderer) => void;

  constructor(renderFunction: (ctx: CanvasRenderingContext2D, csr: ClickableSelfRenderer) => void, size: Vector, pivot: Vector, hint: string, visibleConditionProvider: () => boolean, matrixProvider: () => DOMMatrix) {
    super(size, pivot, hint, visibleConditionProvider, matrixProvider);
    this.renderFunction = renderFunction;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.isVisible()) return;
    ctx.save();
    this.renderFunction(ctx, this);
    ctx.restore();
  }
}
