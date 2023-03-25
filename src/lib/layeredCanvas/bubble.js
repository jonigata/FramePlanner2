const minimumBubbleSize = 72;
const threshold = 10;

export class Bubble {
  constructor() {
    this.p0 = [0, 0];
    this.p1 = [128, 128];
    this.text = "empty";
    this.shape = "square";
    this.fontStyle = "normal";
    this.fontWeight = "400";
    this.fontSize = 22;
    this.fontFamily = "Shippori Mincho";
    this.direction = 'v';
    this.fontColor = '#000000FF';
    this.fillColor = '#ffffffE6';
    this.strokeColor = "#000000FF";
    this.strokeWidth = 1;
  }

  clone() {
    const b = new Bubble();
    b.p0 = [...this.p0];
    b.p1 = [...this.p1];
    b.text = this.text;
    b.shape = this.shape;
    b.fontStyle = this.fontStyle;
    b.fontWeight = this.fontWeight;
    b.fontSize = this.fontSize;
    b.fontFamily = this.fontFamily;
    b.direction = this.direction;
    b.fontColor = this.fontColor;
    b.fillColor = this.fillColor;
    b.strokeColor = this.strokeColor;
    b.strokeWidth = this.strokeWidth;
    return b;
  }

  hasEnoughSize() {
    return (
      this.p1[0] - this.p0[0] >= minimumBubbleSize &&
      this.p1[1] - this.p0[1] >= minimumBubbleSize
    );
  }

  contains(p) {
    const [px, py] = p;
    const [rx0, ry0] = this.p0;
    const [rx1, ry1] = this.p1;

    return rx0 <= px && px <= rx1 && ry0 <= py && py <= ry1;
  }

  getHandleAt(p) {
    const handles = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "top",
      "bottom",
      "left",
      "right",
    ];
    for (let handle of handles) {
      const rect = this.getHandleRect(handle);
      if (this.rectContains(rect, p)) {
        return handle;
      }
    }
    return null;
  }

  rectContains(rect, p) {
    const [x, y] = p;
    const [rx, ry, rw, rh] = rect;
    return rx <= x && x <= rx + rw && ry <= y && y <= ry + rh;
  }

  getHandleRect(handle) {
    const [x, y] = this.p0;
    const [w, h] = [this.p1[0] - this.p0[0], this.p1[1] - this.p0[1]];

    switch (handle) {
      case "top-left":
        return [x - threshold, y - threshold, threshold * 2, threshold * 2];
      case "top-right":
        return [x + w - threshold, y - threshold, threshold * 2, threshold * 2];
      case "bottom-left":
        return [x - threshold, y + h - threshold, threshold * 2, threshold * 2];
      case "bottom-right":
        return [
          x + w - threshold,
          y + h - threshold,
          threshold * 2,
          threshold * 2,
        ];
      case "top":
        return [x - threshold, y - threshold, w + threshold * 2, threshold * 2];
      case "bottom":
        return [
          x - threshold,
          y + h - threshold,
          w + threshold * 2,
          threshold * 2,
        ];
      case "left":
        return [x - threshold, y - threshold, threshold * 2, h + threshold * 2];
      case "right":
        return [
          x + w - threshold,
          y - threshold,
          threshold * 2,
          h + threshold * 2,
        ];
    }
    return null;
  }
}
