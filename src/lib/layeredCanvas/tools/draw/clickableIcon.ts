import type { Vector, Rect } from "../geometry/geometry";

export class BaseIcon {
  static tmpCanvas = null;
  static tmpCtx = null;

  hintIfContains(point: Vector, f: (v:Vector,h:string)=>void): boolean {
    throw new Error("Method not implemented.");
  }
  contains(p: Vector): boolean {
    throw new Error("Method not implemented.");
  }
  boudingRect(): Rect {
    throw new Error("Method not implemented.");
  }

  renderImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, position: Vector, size: Vector, pivot: Vector) {
    if (image.width === 0 || image.height === 0) return;
    if (!BaseIcon.tmpCanvas) {
      BaseIcon.tmpCanvas = document.createElement("canvas");
      BaseIcon.tmpCtx = BaseIcon.tmpCanvas.getContext("2d");
    }
    BaseIcon.tmpCanvas.width = image.width;
    BaseIcon.tmpCanvas.height = image.height;
    BaseIcon.tmpCtx.drawImage(image, 0, 0);

    ctx.save();
    const matrix = ctx.getTransform();
    const scale = matrix.a; // 1:1と仮定
    const rscale = 1 / scale;
    let [x,y] = position;
    x -= pivot[0] * size[0] * rscale;
    y -= pivot[1] * size[1] * rscale;
    let [sx, sy] = [size[0] * rscale, size[1] * rscale];
    ctx.shadowColor = '#404040';
    ctx.shadowBlur = 3;
    ctx.drawImage(ClickableIcon.tmpCanvas, x, y, sx, sy);
    ctx.restore();
  }
}

export class ClickableIcon extends BaseIcon {
  src: string;
  position: Vector;
  size: Vector;
  pivot: Vector;
  image: HTMLImageElement;
  hint: string;
  visibleConditionProvider: () => boolean;

  constructor(src: string, size: Vector, pivot: Vector, hint: string, visibleConditionProvider: () => boolean) {
    super();
    const url = new URL(`../../../../assets/${src}`, import.meta.url).href;
    this.src = url;
    this.position = [0,0];
    this.size = size;
    this.pivot = pivot;
    this.image = new Image();
    this.image.src = this.src;
    this.hint = hint;
    this.visibleConditionProvider = visibleConditionProvider;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.isVisible()) return;

    this.renderImage(ctx, this.image, this.position, this.size, this.pivot);
  }

  contains(p: Vector): boolean {
    if (!this.isVisible()) return false;
    const [x, y, w, h] = this.boudingRect();
    const f = x <= p[0] && p[0] <= x + w && y <= p[1] && p[1] <= y + h;
    return f;
  }

  get center(): Vector {
    const [x,y] = this.pivotPosition;
    const [w,h] = this.size;
    return [x + w / 2, y + h / 2];
  }

  get pivotPosition(): Vector {
    let [x,y] = this.position;
    x -= this.pivot[0] * this.size[0];
    y -= this.pivot[1] * this.size[1];
    return [x,y];
  }

  get hintPosition(): Vector {
    const p = this.center;
    return [p[0], p[1] - 32];
  }

  isVisible(): boolean {
    return !this.visibleConditionProvider || this.visibleConditionProvider();
  }

  hintIfContains(point: Vector, f: (v:Vector,h:string)=>void): boolean {
    if (this.contains(point)) {
      f(this.hintPosition, this.hint);
      return true;
    }
    return false;
  }

  doItIfContains(point: Vector, f: (v:Vector)=>void): boolean {
    if (this.contains(point)) {
      f(point);
      return true;
    }
    return false;
  }

  boudingRect(): Rect {
    let [x, y] = [...this.position];
    x -= this.pivot[0] * this.size[0];
    y -= this.pivot[1] * this.size[1];
    const [w, h] = this.size;
    return [x, y, w, h];
  }

  static calcPosition(rect: Rect, unit: Vector, regularizedOrigin: Vector, offsetUnit: Vector): Vector {
    const [x, y, w, h] = rect;
    const origin = [x + w * regularizedOrigin[0], y + h * regularizedOrigin[1]];
    return [origin[0] + unit[0] * offsetUnit[0], origin[1] + unit[1] * offsetUnit[1]];
  }
}

export class MultistateIcon extends BaseIcon {
  images: HTMLImageElement[];
  position: Vector;
  size: Vector;
  pivot: Vector;
  hint: string;
  visibleConditionProvider: () => boolean;
  index: number;
  
  constructor(srcs: string[], size: Vector, pivot: Vector, hint: string, visibleConditionProvider: () => boolean) {
    super();
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
    this.index = 0;
  }

  render(ctx: CanvasRenderingContext2D) { // Add type annotation for ctx parameter
    if (!this.isVisible()) return;
    this.renderImage(ctx, this.images[this.index], this.position, this.size, this.pivot);
  }

  contains(p: Vector): boolean {
    if (!this.isVisible()) return false;
    const [x, y, w, h] = this.boudingRect();
    const f = x <= p[0] && p[0] <= x + w && y <= p[1] && p[1] <= y + h;
    return f;
  }

  get center(): Vector {
    const x = this.position[0] + this.size[0] / 2;
    const y = this.position[1] + this.size[1] / 2;
    return [x, y];
  }

  get hintPosition(): Vector {
    const p = this.center;
    return [p[0], p[1] - 32];
  }

  isVisible(): boolean {
    return !this.visibleConditionProvider || this.visibleConditionProvider();
  }

  hintIfContains(point: Vector, f: (v: Vector, h: string) => void): boolean {
    if (this.contains(point)) {
      f(this.hintPosition, this.hint);
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

  boudingRect(): Rect {
    let [x, y] = [...this.position];
    x -= this.pivot[0] * this.size[0];
    y -= this.pivot[1] * this.size[1];
    const [w, h] = this.size;
    return [x, y, w, h];
  }

}