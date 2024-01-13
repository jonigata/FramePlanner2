import { v4 as uuidv4 } from 'uuid';
import type { Vector, Rect } from '../tools/geometry/geometry';
import type { V } from 'vitest/dist/types-fe79687a';

const minimumBubbleSize = 72;
const threshold = 10;

export class BubbleRenderInfo { // serializeしない
  pathJson: string;
  path: paper.PathItem;
  unitedPath: paper.PathItem;
  children: Bubble[];

  textJson: string;
  textCanvas: HTMLCanvasElement;
  textCtx: CanvasRenderingContext2D;
}

export class Bubble {
  p0: Vector;
  p1: Vector;
  offset: Vector;
  rotation: number;
  text: string;
  shape: string;
  embedded: boolean;
  fontStyle: string;
  fontWeight: string;
  fontSize: number;
  fontFamily: string;
  direction: string;
  fontColor: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  outlineColor: string;
  outlineWidth: number;
  autoNewline: boolean;
  uuid: string;
  parent: string;
  creationContext: string;
  image: any;
  optionContext: any;
  pageNumber: number; // for debug

  renderInfo: BubbleRenderInfo;

  constructor() {
    this.reset();
    this.p0 = [0, 0];
    this.p1 = [128, 128];
    this.text = "empty";
    this.uuid = uuidv4();
    this.parent = null;
    this.creationContext = this.getStackTrace();

    this.image = null;
    this.optionContext = {};
  }

  reset() {
    this.offset = [0, 0];
    this.rotation = 0;
    this.shape = "rounded";
    this.embedded = false;
    this.fontStyle = "normal";
    this.fontWeight = "400";
    this.fontSize = 32;
    this.fontFamily = "源暎アンチック";
    this.direction = 'v';
    this.fontColor = '#000000FF';
    this.fillColor = '#ffffffE6';
    this.strokeColor = "#000000FF";
    this.strokeWidth = 3;
    this.outlineWidth = 0;
    this.outlineColor = "#000000FF";
    this.autoNewline = false;
  }

  getStackTrace() {
    return Error().stack;
  }

  clone(): Bubble {
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
    b.outlineColor = this.outlineColor;
    b.outlineWidth = this.outlineWidth;
    b.autoNewline = this.autoNewline;
    b.uuid = uuidv4();
    b.parent = null;

    b.image = this.image ? {...this.image} : null;
    b.optionContext = {...this.optionContext};
    return b;
  }

  copyStyleFrom(c): void {
    this.shape = c.shape;
    this.embedded = c.embedded;
    this.fontStyle = c.fontStyle;
    this.fontWeight = c.fontWeight;
    this.fontSize = c.fontSize;
    this.fontFamily = c.fontFamily;
    this.direction = c.direction;
    this.fontColor = c.fontColor;
    this.fillColor = c.fillColor;
    this.strokeColor = c.strokeColor;
    this.strokeWidth = c.strokeWidth;
    this.outlineColor = c.outlineColor;
    this.outlineWidth = c.outlineWidth;
    this.autoNewline = c.autoNewline;
    this.optionContext = {...c.optionContext};
  }

  static compile(canvasSize, json): Bubble {
    const b = new Bubble();
    b.p0 = this.denormalizedPosition(canvasSize, json.p0);
    b.p1 = this.denormalizedPosition(canvasSize, json.p1);
    b.offset = json.offset ?? [0,0];
    b.rotation = json.rotation ?? 0;
    b.text = json.text ?? "";
    b.shape = json.shape ?? "square";
    if (b.shape == "harsh-curve") b.shape = "shout";
    b.embedded = json.embedded ?? false;
    b.fontStyle = json.fontStyle ?? "normal";
    b.fontWeight = json.fontWeight ?? "400";
    b.fontSize = json.fontSize ? json.fontSize * Math.min(canvasSize[0], canvasSize[1]) : 26;
    b.fontFamily = json.fontFamily ?? "Noto Sans JP";
    b.direction = json.direction ?? 'v';
    b.fontColor = json.fontColor ?? '#000000FF';
    b.fillColor = json.fillColor ?? '#ffffffE6';
    b.strokeColor = json.strokeColor ?? "#000000FF";
    b.strokeWidth = json.strokeWidth ?? 1;
    b.outlineColor = json.outlineColor ?? "#000000FF";
    b.outlineWidth = json.outlineWidth ?? 0;
    b.autoNewline = json.autoNewline ?? true;
    b.uuid = json.uuid ?? uuidv4();
    b.parent = json.parent;
    b.optionContext = Bubble.getInitialOptions(b);
    Object.assign(b.optionContext, json.optionContext ?? {});
    return b;
  }

  static decompile(canvasSize: [number, number], b: Bubble): any {
    return {
      p0: this.normalizedPosition(canvasSize, b.p0),
      p1: this.normalizedPosition(canvasSize, b.p1),
      offset: b.offset[0] == 0 && b.offset[1] == 0 ? undefined : b.offset,
      rotation: b.rotation == 0 ? undefined : b.rotation,
      text: b.text == "" ? undefined : b.text,
      shape: b.shape == "square" ? undefined : b.shape,
      embedded: b.embedded == false ? undefined : b.embedded,
      fontStyle: b.fontStyle == "normal" ? undefined : b.fontStyle,
      fontWeight: b.fontWeight == "400" ? undefined : b.fontWeight,
      fontSize: b.fontSize == 26 ? undefined : b.fontSize / Math.min(canvasSize[0], canvasSize[1]),
      fontFamily: b.fontFamily == "Noto Sans JP" ? undefined : b.fontFamily,
      direction: b.direction == 'v' ? undefined : b.direction,
      fontColor: b.fontColor == '#000000FF' ? undefined : b.fontColor,
      fillColor: b.fillColor == '#ffffffE6' ? undefined : b.fillColor,
      strokeColor: b.strokeColor == "#000000FF" ? undefined : b.strokeColor,
      strokeWidth: b.strokeWidth == 1 ? undefined : b.strokeWidth,
      outlineColor: b.outlineColor == "#000000FF" ? undefined : b.outlineColor,
      outlineWidth: b.outlineWidth == 0 ? undefined : b.outlineWidth,
      autoNewline: b.autoNewline ? undefined : b.autoNewline,
      uuid: b.uuid,
      parent: b.parent,
      optionContext: JSON.stringify(b.optionContext) == JSON.stringify(Bubble.getInitialOptions(b)) ? undefined : b.optionContext,
    };
  }

  hasEnoughSize(): boolean {
    return (
      minimumBubbleSize <= Math.abs(this.p1[0] - this.p0[0]) &&
      minimumBubbleSize <= Math.abs(this.p1[1] - this.p0[1])
    );
  }

  // TODO: どっちか不要？
  static forceEnoughSize(size: Vector): Vector {
    return [
      Math.max(size[0], minimumBubbleSize + 1),
      Math.max(size[1], minimumBubbleSize + 1),
    ];
  }

  forceEnoughSize() {
    const enoughSize = Bubble.forceEnoughSize(this.size);
    this.size.splice(0, 2, ...enoughSize);
  }

  contains(p: Vector): boolean {
    const [px, py] = p;
    const [rx0, ry0] = this.p0;
    const [rx1, ry1] = this.p1;

    return rx0 <= px && px <= rx1 && ry0 <= py && py <= ry1;
  }

  getHandleAt(p: Vector): string {
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

  rectContains(rect: Rect, p: Vector): boolean {
    const [x, y] = p;
    const [rx, ry, rw, rh] = rect;
    return rx <= x && x <= rx + rw && ry <= y && y <= ry + rh;
  }

  getHandleRect(handle: string): Rect {
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

  regularized(): [Vector, Vector] {
    const p0: Vector = [Math.min(this.p0[0], this.p1[0]), Math.min(this.p0[1], this.p1[1])];
    const p1: Vector = [Math.max(this.p0[0], this.p1[0]), Math.max(this.p0[1], this.p1[1])];
    return [p0, p1];
  }

  regularize(): void {
    [this.p0, this.p1] = this.regularized();
  }

  regularizedBox(): [Vector, Vector] {
    const [p0, p1] = this.regularized();
    const [x, y] = p0;
    const [w, h] = [p1[0] - p0[0], p1[1] - p0[1]];
    return [p0, [w, h]];
  }
  
  canLink(): boolean {
    console.log(this.optionSet);
    return !!this.optionSet.link;
  }

  linkTo(b: Bubble): void {
    this.parent = b.uuid;
  }

  linkedTo(b: Bubble): boolean {
    return this.parent === b.uuid || b.parent === this.uuid;
  }

  static normalizedPosition(canvasSize: Vector, p: Vector): Vector {
    return [p[0] / canvasSize[0], p[1] / canvasSize[1]];
  }

  static denormalizedPosition(canvasSize: Vector, p: Vector): Vector {
    return [p[0] * canvasSize[0], p[1] * canvasSize[1]];
  }

  get center(): Vector {
    return [(this.p0[0] + this.p1[0]) / 2, (this.p0[1] + this.p1[1]) / 2];
  }

  set center(p: Vector) {
    const size = this.size;
    this.p0 = [p[0] - size[0] / 2, p[1] - size[1] / 2];
    this.p1 = [p[0] + size[0] / 2, p[1] + size[1] / 2];
  }

  get size(): Vector {
    return [Math.abs(this.p1[0] - this.p0[0]), Math.abs(this.p1[1] - this.p0[1])];
  }

  set size(s: Vector) {
    const center = this.center;
    this.p0 = [center[0] - s[0] / 2, center[1] - s[1] / 2];
    this.p1 = [center[0] + s[0] / 2, center[1] + s[1] / 2];
  }

  get imageSize(): Vector {
    return [this.image?.image.width, this.image?.image.height];
  }  

  get optionSet(): any {
    return bubbleOptionSets[this.shape];
  }

  get centeredRect(): Rect {
    const s = this.size;
    return [- s[0] / 2, - s[1] / 2, s[0], s[1]];
  }

  initOptions(): void {
    this.optionContext = Bubble.getInitialOptions(this);
  }

  static getInitialOptions(b, sample=false): any {
    const optionSet = bubbleOptionSets[b.shape];
    const options = {};
    for (const option of Object.keys(optionSet)) {
      if (optionSet[option].init) {
        options[option] = optionSet[option].init(b);
        if (sample && optionSet[option].sampleInit) {
          options[option] = optionSet[option].sampleInit(b);
        }
      }
    }
    return options;
  }

  move(p: Vector): void {
    const size = this.size;
    this.p0 = [p[0] - size[0] / 2, p[1] - size[1] / 2];
    this.p1 = [p[0] + size[0] / 2, p[1] + size[1] / 2];
  }

}

export const bubbleOptionSets = {
  "rounded": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端", icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中", icon:"curve", init: (b) => [0.5,0]},
    xStraight: { label: "横線の長さ", type: "number", min: 0, max: 0.9, step: 0.01, init: b => 0 },
    yStraight: { label: "縦線の長さ", type: "number", min: 0, max: 0.9, step: 0.01, init: b => 0 },
    extract: {label: "食い込み", type:"boolean", init: b => false},
    extractWidth: {label: "食い込み広さ", type:"number", min: 0, max: 1, step: 0.01, init: b => 0.2},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "square": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    extract: {label: "食い込み", type:"boolean", init: b => false},
    extractWidth: {label: "食い込み広さ", type:"number", min: 0, max: 1, step: 0.01, init: b => 0.2},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "ellipse": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    extract: {label: "食い込み", type:"boolean", init: b => false},
    extractWidth: {label: "食い込み広さ", type:"number", min: 0, max: 1, step: 0.01, init: b => 0.2},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "concentration": {
    lineCount: { label: "線の本数", type: "number", min: 100, max: 300, step: 1, init: b => 200 },
    lineLength: { label: "線の長さ", type: "number", min: 1.05, max: 1.50, step: 0.01, init: b => 1.3 },
  },
  "polygon": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3 },
    vertexCount: { label: "頂点の数", type: "number", min: 4, max: 20, step: 1, init: b => 7 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.4 },
    extract: {label: "食い込み", type:"boolean", init: b => false},
    extractWidth: {label: "食い込み広さ", type:"number", min: 0, max: 1, step: 0.01, init: b => 0.2},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "strokes": {
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3 },
    vertexCount: { label: "頂点の数", type: "number", min: 4, max: 20, step: 1, init: b => 10 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.5 },
    overRun: { label: "オーバーラン", type: "number", min: 1.01, max: 1.4, step: 0.01, init: b => 1.2 },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "double-strokes": {
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3 },
    vertexCount: { label: "頂点の数", type: "number", min: 4, max: 20, step: 1, init: b => 10 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.5 },
    overRun: { label: "オーバーラン", type: "number", min: 1.01, max: 1.4, step: 0.01, init: b => 1.25 },
    interval: { label: "間隔", type: "number", min: 0.01, max: 0.2, step: 0.01, init: b => 0.04 },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "harsh": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",
    icon:"tail", init: (b) => [0,0]},
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3 },
    bumpDepth: { label: "でこぼこの深さ", type: "number", min: 0.01, max: 0.2, step: 0.01, init: b => 0.07 },
    bumpCount: { label: "でこぼこの数", type: "number", min: 4, max: 20, step: 1, init: b => 15 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.1 },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "shout": {
    link: {hint:"結合", icon:"unite"},
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]},
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 6, sampleInit: b => 6 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3, sampleInit: b => 3 },
    bumpSharp: { label: "でっぱりの鋭さ", type: "number", min: 0.01, max: 0.5, step: 0.01, init: b => 0.16, sampleInit: b => 0.2 },
    bumpCount: { label: "でっぱりの数", type: "number", min: 4, max: 20, step: 1, init: b => 10 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.5, sampleInit: b => 0.2 },
    depthJitter: { label: "鋭さジッター", type: "number", min: 0, max: 1.5, step: 0.01, init: b => 0.5, sampleInit: b => 0.1  },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "soft": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3 },
    bumpDepth: { label: "でこぼこの深さ", type: "number", min: 0.01, max: 0.2, step: 0.01, init: b => 0.15 },
    bumpCount: { label: "でこぼこの数", type: "number", min: 4, max: 20, step: 1, init: b => 8 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.4 },
    extract: {label: "食い込み", type:"boolean", init: b => false},
    extractWidth: {label: "食い込み広さ", type:"number", min: 0, max: 1, step: 0.01, init: b => 0.2},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "heart" : {
    link: {hint:"結合", icon:"unite"},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "diamond": {
    link: {hint:"結合", icon:"unite"},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "arrow": {
    link: {hint:"結合", icon:"unite"},
    shaftWidth: { label: "軸の太さ", type: "number", min: 0, max: 1, step: 0.01, init: b => 0.5 },
    headLength: { label: "矢じりの長さ", type: "number", min: 0, max: 1, step: 0.01, init: b => 0.5 },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "motion-lines": {
    focalPoint: {hint:"内円の中心", icon:"circle", init: (b) => [0, 0] }, 
    focalRange: {hint: "内円の範囲", icon:"radius", init: (b) => [0, Math.hypot(b.size[0]/2, b.size[1]/2) * 0.25] },
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    lineCount: { label: "線の本数", type: "number", min: 100, max: 300, step: 1, init: b => 200 },
    lineWidth: { label: "線の太さ", type: "number", min: 0.01, max: 0.1, step: 0.01, init: b => 0.05 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0.05 },
    startJitter: { label: "起点ジッター", type: "number", min: 0, max: 1.0, step: 0.01, init: b => 0.5 },
  },
  "speed-lines": {
    tailTip: {hint: "流線の先端",icon:"tail", init: (b) => [b.size[0]*0.4,0]},
    tailMid: {hint: "流線の途中",icon:"curve", init: (b) => [0.5,0]},
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    lineCount: { label: "線の本数", type: "number", min: 10, max: 200, step: 1, init: b => 70 },
    lineWidth: { label: "線の太さ", type: "number", min: 0.01, max: 1.0, step: 0.01, init: b => 0.2 },
    laneJitter: { label: "間隔ジッター", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0.05 },
    startJitter: { label: "起点ジッター", type: "number", min: 0, max: 0.5, step: 0.01, init: b => 0.3 },
  },
  "ellipse-mind": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "soft-mind": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    randomSeed: { label: "乱数調整", type: "number", min: 0, max: 100, step: 1, init: b => 0 },
    superEllipse: { label: "矩形っぽさ", type: "number", min: 1, max: 8, step: 0.1, init: b => 3 },
    bumpDepth: { label: "でこぼこの深さ", type: "number", min: 0.01, max: 0.2, step: 0.01, init: b => 0.15 },
    bumpCount: { label: "でこぼこの数", type: "number", min: 4, max: 20, step: 1, init: b => 8 },
    angleJitter: { label: "角度ジッター", type: "number", min: 0, max: 1.0, step: 0.1, init: b => 0.4 },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "rounded-mind": {
    link: {hint:"結合", icon:"unite"}, 
    tailTip: {hint: "しっぽの先端",icon:"tail", init: (b) => [0,0]}, 
    tailMid: {hint: "しっぽの途中",icon:"curve", init: (b) => [0.5,0]},
    xStraight: { label: "横線の長さ", type: "number", min: 0, max: 0.9, step: 0.01, init: b => 0 },
    yStraight: { label: "縦線の長さ", type: "number", min: 0, max: 0.9, step: 0.01, init: b => 0 },
    shapeExpand: {label: "はみだし", type: "number", min: 0, max: 0.2, step: 0.01, init: b => 0},
  },
  "none": {},
};
