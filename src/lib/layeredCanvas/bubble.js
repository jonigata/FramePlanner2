import { v4 as uuidv4 } from 'uuid';

const minimumBubbleSize = 72;
const threshold = 10;

export class Bubble {
  constructor() {
    this.p0 = [0, 0];
    this.p1 = [128, 128];
    this.offset = [0, 0];
    this.rotation = 0;
    this.text = "empty";
    this.shape = "square";
    this.embedded = false;
    this.fontStyle = "normal";
    this.fontWeight = "400";
    this.fontSize = 26;
    this.fontFamily = "Shippori Mincho";
    this.direction = 'v';
    this.fontColor = '#000000FF';
    this.fillColor = '#ffffffE6';
    this.strokeColor = "#000000FF";
    this.strokeWidth = 2;
    this.uuid = uuidv4();
    this.parent = null;

    this.image = null;
    this.optionContext = {};
  }

  clone() {
    const b = new Bubble();
    b.p0 = [...this.p0];
    b.p1 = [...this.p1];
    b.offset = [...this.offset];
    b.rotation = this.rotation;
    b.text = this.text;
    b.shape = this.shape;
    b.embedded = this.embedded;
    b.fontStyle = this.fontStyle;
    b.fontWeight = this.fontWeight;
    b.fontSize = this.fontSize;
    b.fontFamily = this.fontFamily;
    b.direction = this.direction;
    b.fontColor = this.fontColor;
    b.fillColor = this.fillColor;
    b.strokeColor = this.strokeColor;
    b.strokeWidth = this.strokeWidth;
    b.uuid = uuidv4();
    b.parent = null;

    b.image = this.image ? {...this.image} : null;
    b.optionContext = {...this.optionContext};
    return b;
  }

  static compile(canvasSize, json) {
    const b = new Bubble();
    b.p0 = this.denormalizedPosition(canvasSize, json.p0);
    b.p1 = this.denormalizedPosition(canvasSize, json.p1);
    b.offset = json.offset;
    b.rotation = json.rotation;
    b.text = json.text;
    b.shape = json.shape;
    b.embedded = json.embedded;
    b.fontStyle = json.fontStyle;
    b.fontWeight = json.fontWeight;
    b.fontSize = json.fontSize * Math.min(canvasSize[0], canvasSize[1]);
    b.fontFamily = json.fontFamily;
    b.direction = json.direction;
    b.fontColor = json.fontColor;
    b.fillColor = json.fillColor;
    b.strokeColor = json.strokeColor;
    b.strokeWidth = json.strokeWidth;
    b.uuid = json.uuid;
    b.parent = json.parent;
    b.optionContext = json.optionContext;
    return b;
  }

  static decompile(canvasSize, b) {
    return {
      p0: this.normalizedPosition(canvasSize, b.p0),
      p1: this.normalizedPosition(canvasSize, b.p1),
      offset: b.offset,
      rotation: b.rotation,
      text: b.text,
      shape: b.shape,
      embedded: b.embedded,
      fontStyle: b.fontStyle,
      fontWeight: b.fontWeight,
      fontSize: b.fontSize / Math.min(canvasSize[0], canvasSize[1]),
      fontFamily: b.fontFamily,
      direction: b.direction,
      fontColor: b.fontColor,
      fillColor: b.fillColor,
      strokeColor: b.strokeColor,
      strokeWidth: b.strokeWidth,
      uuid: b.uuid,
      parent: b.parent,
      optionContext: b.optionContext,
    };
  }

  hasEnoughSize() {
    return (
      minimumBubbleSize <= Math.abs(this.p1[0] - this.p0[0]) &&
      minimumBubbleSize <= Math.abs(this.p1[1] - this.p0[1])
    );
  }

  static forceEnoughSize(size) {
    return [
      Math.max(size[0], minimumBubbleSize + 1),
      Math.max(size[1], minimumBubbleSize + 1),
    ];
  }

  forceEnoughSize() {
    if (this.p1[0] - this.p0[0] < minimumBubbleSize + 1) {
      this.p1[0] = this.p0[0] + minimumBubbleSize + 1;
    }
    if (this.p1[1] - this.p0[1] < minimumBubbleSize + 1) {
      this.p1[1] = this.p0[1] + minimumBubbleSize + 1;
    }
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

  regularized() {
    const p0 = [Math.min(this.p0[0], this.p1[0]), Math.min(this.p0[1], this.p1[1])];
    const p1 = [Math.max(this.p0[0], this.p1[0]), Math.max(this.p0[1], this.p1[1])];
    return [p0, p1];
  }

  regularize() {
    [this.p0, this.p1] = this.regularized();
  }

  regularizedPositionAndSize() {
    const [p0, p1] = this.regularized();
    const [x, y] = p0;
    const [w, h] = [p1[0] - p0[0], p1[1] - p0[1]];
    return [x, y, w, h];
  }
  
  canLink() {
    console.log(this.optionSet);
    return !!this.optionSet.link;
  }

  linkTo(b) {
    this.parent = b.uuid;
  }

  linkedTo(b) {
    return this.parent === b.uuid || b.parent === this.uuid;
  }

  static normalizedPosition(canvasSize, p) {
    return [p[0] / canvasSize[0], p[1] / canvasSize[1]];
  }

  static denormalizedPosition(canvasSize, p) {
    return [p[0] * canvasSize[0], p[1] * canvasSize[1]];
  }

  get center() {
    return [(this.p0[0] + this.p1[0]) / 2, (this.p0[1] + this.p1[1]) / 2];
  }

  get size() {
    return [Math.abs(this.p1[0] - this.p0[0]), Math.abs(this.p1[1] - this.p0[1])];
  }

  get imageSize() {
    return [this.image?.image.width, this.image?.image.height];
  }  

  get optionSet() {
    return bubbleOptionSets[this.shape];
  }

  get centeredRect() {
    const s = this.size;
    return [- s[0] / 2, - s[1] / 2, s[0], s[1]];
  }

  initOptions() {
    const [cx,cy] = this.center;
    const [w, h] = this.size;
    for (const option of Object.keys(this.optionSet)) {
      if (this.optionSet[option].init) {
        this.optionContext[option] = this.optionSet[option].init(this);
      }
    }
  }

}

export const bubbleOptionSets = {
  "rounded": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]}},
  "square": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]}},
  "ellipse": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]}},
  "concentration": {},
  "polygon": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]}},
  "strokes": {},
  "double-strokes": {},
  "harsh": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}},
  "harsh-curve": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}},
  "soft": {link: {hint:"結合", icon:"unite"}, tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]}},
  "heart" : {link: {hint:"結合", icon:"unite"} },
  "diamond": {link: {hint:"結合", icon:"unite"} },
  "motion-lines": {
    focalPoint: {hint:"内円の中心", icon:"circle", init: (b) => [0, 0] }, 
    focalRange: {hint: "内円の範囲", icon:"radius", init: (b) => [0, Math.hypot(b.size[0]/2, b.size[1]/2) * 0.25] }
  },
  "none": {},
};
