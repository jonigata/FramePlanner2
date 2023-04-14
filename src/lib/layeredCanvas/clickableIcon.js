export class ClickableIcon {
  static tmpCanvas = null;
  static tmpCtx = null;

  constructor(src, size, pivot, hint, visibleConditionProvider) {
    this.src = new URL(`../../assets/${src}`, import.meta.url).href;
    this.position = [0,0];
    this.size = size;
    this.pivot = pivot;
    this.image = new Image();
    this.image.src = this.src;
    this.hint = hint;
    this.visibleConditionProvider = visibleConditionProvider;
  }

  render(ctx) {
    if (!this.isVisible()) return;
    if (!ClickableIcon.tmpCanvas) {
      ClickableIcon.tmpCanvas = document.createElement("canvas");
      ClickableIcon.tmpCtx = ClickableIcon.tmpCanvas.getContext("2d");
    }
    ClickableIcon.tmpCanvas.width = this.image.width;
    ClickableIcon.tmpCanvas.height = this.image.height;

    ClickableIcon.tmpCtx.drawImage(this.image, 0, 0);

    ctx.save();
    const position = [...this.position];
    position[0] -= this.pivot[0] * this.size[0];
    position[1] -= this.pivot[1] * this.size[1];
    ctx.shadowColor = '#404040';
    ctx.shadowBlur = 3;
    ctx.drawImage(ClickableIcon.tmpCanvas,...position,...this.size);
    ctx.restore();
  }

  contains(p) {
    if (!this.isVisible()) return false;
    let [x,y] = [...this.position];
    x -= this.pivot[0] * this.size[0];
    y -= this.pivot[1] * this.size[1];
    const [w,h] = this.size;
    const f = x <= p[0] && p[0] <= x + w && y <= p[1] && p[1] <= y + h;
    return f;
  }

  get center() {
    const x = this.position[0] + this.size[0] / 2;
    const y = this.position[1] + this.size[1] / 2;
    return [x, y];
  }

  get hintPosition() {
    const p = this.center;
    return [p[0], p[1] - 32];
  }

  isVisible() {
    return !this.visibleConditionProvider || this.visibleConditionProvider();
  }

  hintIfContains(point, f) {
    if (this.contains(point)) {
      f(this.hintPosition, this.hint);
      return true;
    }
    return false;
  }

  doItIfContains(point, f) {
    if (this.contains(point)) {
      f(point);
      return true;
    }
    return false;
  }

  static calcPosition(rect, unit, regularizedOrigin, offsetUnit) {
    const [x, y, w, h] = rect;
    const origin = [x + w * regularizedOrigin[0], y + h * regularizedOrigin[1]];
    return [origin[0] + unit[0] * offsetUnit[0], origin[1] + unit[1] * offsetUnit[1]];
  }
}

export class MultistateIcon {
  constructor(srcs, size, pivot, hint, visibleConditionProvider) {
    this.images = srcs.map(src => {
        const image = new Image();
        image.src = new URL(`../../assets/${src}`, import.meta.url).href;
        return image;
    });
    this.position = [0,0];
    this.size = size;
    this.pivot = pivot;
    this.hint = hint;
    this.visibleConditionProvider = visibleConditionProvider;
    this.index = 0;
  }

  render(ctx) {
    if (!this.isVisible()) return;
    ctx.save();
    ctx.shadowColor = "white";
    ctx.shadowBlur = 5;
    const position = [...this.position];
    position[0] -= this.pivot[0] * this.size[0];
    position[1] -= this.pivot[1] * this.size[1];
    ctx.drawImage(this.images[this.index], ...position, ...this.size);
    ctx.restore();
  }

  contains(p) {
    if (!this.isVisible()) return false;
    let [x,y] = [...this.position];
    x -= this.pivot[0] * this.size[0];
    y -= this.pivot[1] * this.size[1];
    const [w,h] = this.size;
    const f = x <= p[0] && p[0] <= x + w && y <= p[1] && p[1] <= y + h;
    return f;
  }

  get center() {
    const x = this.position[0] + this.size[0] / 2;
    const y = this.position[1] + this.size[1] / 2;
    return [x, y];
  }

  get hintPosition() {
    const p = this.center;
    return [p[0], p[1] - 32];
  }

  isVisible() {
    return !this.visibleConditionProvider || this.visibleConditionProvider();
  }

  hintIfContains(point, f) {
    if (this.contains(point)) {
      f(this.hintPosition, this.hint);
      return true;
    }
    return false;
  }

  doItIfContains(point, f) {
    if (this.contains(point)) {
      f(point);
      return true;
    }
    return false;
  }

  increment() {
    this.index = (this.index + 1) % this.images.length;
  }

  reset() {
    this.index = 0;
  }

}