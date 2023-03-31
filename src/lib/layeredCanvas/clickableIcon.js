export class ClickableIcon {
  constructor(src, position, size, hint, visibleConditionProvider) {
    this.src = new URL(`../../assets/${src}`, import.meta.url).href;
    this.position = position;
    this.size = size;
    this.image = new Image();
    this.image.src = this.src;
    this.hint = hint;
    this.visibleConditionProvider = visibleConditionProvider;
  }

  render(ctx) {
    if (!this.isVisible()) return;
    ctx.save();
    ctx.shadowColor = "white";
    ctx.shadowBlur = 5;
    ctx.drawImage(this.image,...this.position,...this.size);
    ctx.restore();
  }

  contains(p) {
    if (!this.isVisible()) return false;
    const [x,y] = this.position;
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
}
