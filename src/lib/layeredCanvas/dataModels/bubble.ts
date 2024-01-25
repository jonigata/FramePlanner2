import { v4 as uuidv4 } from 'uuid';
import type { Vector, Rect } from '../tools/geometry/geometry';
import { rectContains } from '../tools/geometry/geometry';

const minimumBubbleSize = 72;
const threshold = 10;

export type BubbleBorderHandle = 
  "top-left"|
  "top-right"|
  "bottom-left"|
  "bottom-right"|
  "top"|
  "bottom"|
  "left"|
  "right";

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
  // n_p0, n_p1, n_offset, n_fontSize, n_strokeWidth, n_outlineWidthはnormalized
  n_p0: Vector;
  n_p1: Vector;
  n_offset: Vector;
  rotation: number;
  text: string;
  shape: string;
  embedded: boolean;
  fontStyle: string;
  fontWeight: string;
  n_fontSize: number;
  fontFamily: string;
  direction: string;
  fontColor: string;
  fillColor: string;
  strokeColor: string;
  n_strokeWidth: number;
  outlineColor: string;
  n_outlineWidth: number;
  autoNewline: boolean;
  uuid: string;
  parent: string;
  creationContext: string;
  image: { 
    image: HTMLImageElement, 
    scale: Vector,
    translation: Vector,
    scaleLock: boolean,
  } | null;
  optionContext: any;
  pageNumber: number; // for debug

  renderInfo: BubbleRenderInfo;

  constructor() {
    this.reset();
    this.n_p0 = [0, 0];
    this.n_p1 = [0.1, 0.1];
    this.text = "empty";
    this.uuid = uuidv4();
    this.parent = null;
    this.creationContext = this.getStackTrace();

    this.image = null;
    this.optionContext = {};
  }

  reset() {
    const unit = 1 / 880;
    this.n_offset = [0, 0];
    this.rotation = 0;
    this.shape = "rounded";
    this.embedded = false;
    this.fontStyle = "normal";
    this.fontWeight = "400";
    this.n_fontSize = 32 * unit;
    this.fontFamily = "源暎アンチック";
    this.direction = 'v';
    this.fontColor = '#000000FF';
    this.fillColor = '#ffffffE6';
    this.strokeColor = "#000000FF";
    this.n_strokeWidth = 3 * unit;
    this.n_outlineWidth = 0;
    this.outlineColor = "#000000FF";
    this.autoNewline = false;
  }

  getStackTrace() {
    return Error().stack;
  }

  clone(): Bubble {
    const b = new Bubble();
    b.n_p0 = [...this.n_p0];
    b.n_p1 = [...this.n_p1];
    b.n_offset = [...this.n_offset];
    b.rotation = this.rotation;
    b.text = this.text;
    b.shape = this.shape;
    b.embedded = this.embedded;
    b.fontStyle = this.fontStyle;
    b.fontWeight = this.fontWeight;
    b.n_fontSize = this.n_fontSize;
    b.fontFamily = this.fontFamily;
    b.direction = this.direction;
    b.fontColor = this.fontColor;
    b.fillColor = this.fillColor;
    b.strokeColor = this.strokeColor;
    b.n_strokeWidth = this.n_strokeWidth;
    b.outlineColor = this.outlineColor;
    b.n_outlineWidth = this.n_outlineWidth;
    b.autoNewline = this.autoNewline;
    b.uuid = uuidv4();
    b.parent = null;

    b.image = this.image ? {...this.image} : null;
    b.optionContext = {...this.optionContext};
    return b;
  }

  copyStyleFrom(c: Bubble): void {
    this.shape = c.shape;
    this.embedded = c.embedded;
    this.fontStyle = c.fontStyle;
    this.fontWeight = c.fontWeight;
    this.n_fontSize = c.n_fontSize;
    this.fontFamily = c.fontFamily;
    this.direction = c.direction;
    this.fontColor = c.fontColor;
    this.fillColor = c.fillColor;
    this.strokeColor = c.strokeColor;
    this.n_strokeWidth = c.n_strokeWidth;
    this.outlineColor = c.outlineColor;
    this.n_outlineWidth = c.n_outlineWidth;
    this.autoNewline = c.autoNewline;
    this.optionContext = {...c.optionContext};
  }

  static getUnit(paperSize: Vector): number {
    return  1 / Math.min(paperSize[0], paperSize[1]);
  }

  static compile(paperSize: Vector, json: any): Bubble {
    // 古いjsonはn_に一貫性がない
    const unit = Bubble.getUnit(paperSize);
    const normalizedNumber = (v1, v2, v3) => { if (v1) { return v1; } else if (v2) { return v2 * unit; } else { return v3 * unit; }}

    const b = new Bubble();
    b.n_p0 = json.p0 ?? json.n_p0;
    b.n_p1 = json.p1 ?? json.n_p1;
    b.n_offset = [0,0];
    if (json.n_offset) {
      b.n_offset = json.n_offset;
    } else if (json.offset) {
      b.n_offset = this.denormalizedPosition(paperSize, json.offset);
    }
    b.rotation = json.rotation ?? 0;
    b.text = json.text ?? "";
    b.shape = json.shape ?? "square";
    if (b.shape == "harsh-curve") b.shape = "shout";
    b.embedded = json.embedded ?? false;
    b.fontStyle = json.fontStyle ?? "normal";
    b.fontWeight = json.fontWeight ?? "400";
    b.n_fontSize = normalizedNumber(json.n_fontSize, json.fontSize, 26);
    b.fontFamily = json.fontFamily ?? "Noto Sans JP";
    b.direction = json.direction ?? 'v';
    b.fontColor = json.fontColor ?? '#000000FF';
    b.fillColor = json.fillColor ?? '#ffffffE6';
    b.strokeColor = json.strokeColor ?? "#000000FF";
    b.n_strokeWidth = normalizedNumber(json.n_strokeWidth, json.strokeWidth, 1);
    b.outlineColor = json.outlineColor ?? "#000000FF";
    b.n_outlineWidth = normalizedNumber(json.n_outlineWidth, json.outlineWidth, 0);
    b.autoNewline = json.autoNewline ?? true;
    b.uuid = json.uuid ?? uuidv4();
    b.parent = json.parent;
    b.optionContext = Bubble.getInitialOptions(b);
    Object.assign(b.optionContext, json.optionContext ?? {});
    return b;
  }

  static decompile(paperSize: Vector, b: Bubble): any {
    const unit = Bubble.getUnit(paperSize);
    const equalNumber = (v1, v2) => { return Math.abs(v1 - v2) < 0.0001; }
    return {
      n_p0: b.n_p0,
      n_p1: b.n_p0,
      n_offset: b.n_offset[0] == 0 && b.n_offset[1] == 0 ? undefined : b.n_offset,
      rotation: b.rotation == 0 ? undefined : b.rotation,
      text: b.text == "" ? undefined : b.text,
      shape: b.shape == "square" ? undefined : b.shape,
      embedded: b.embedded == false ? undefined : b.embedded,
      fontStyle: b.fontStyle == "normal" ? undefined : b.fontStyle,
      fontWeight: b.fontWeight == "400" ? undefined : b.fontWeight,
      n_fontSize: equalNumber(b.n_fontSize, 26 * unit) ? undefined : b.n_fontSize,
      fontFamily: b.fontFamily == "Noto Sans JP" ? undefined : b.fontFamily,
      direction: b.direction == 'v' ? undefined : b.direction,
      fontColor: b.fontColor == '#000000FF' ? undefined : b.fontColor,
      fillColor: b.fillColor == '#ffffffE6' ? undefined : b.fillColor,
      strokeColor: b.strokeColor == "#000000FF" ? undefined : b.strokeColor,
      n_strokeWidth: equalNumber(b.n_strokeWidth, 1 * unit) ? undefined : b.n_strokeWidth,
      outlineColor: b.outlineColor == "#000000FF" ? undefined : b.outlineColor,
      n_outlineWidth: equalNumber(b.n_outlineWidth, 0 * unit) ? undefined : b.n_outlineWidth,
      autoNewline: b.autoNewline ? undefined : b.autoNewline,
      uuid: b.uuid,
      parent: b.parent,
      optionContext: JSON.stringify(b.optionContext) == JSON.stringify(Bubble.getInitialOptions(b)) ? undefined : b.optionContext,
    };
  }

  static getPhysicalPoint(paperSize: Vector, n_p: Vector): Vector {
    return [n_p[0] * paperSize[0], n_p[1] * paperSize[1]];
  }

  getPhysicalRect(paperSize: Vector): Rect {
    const [x0, y0] = Bubble.getPhysicalPoint(paperSize, this.n_p0);
    const [x1, y1] = Bubble.getPhysicalPoint(paperSize, this.n_p1);
    return [x0, y0, x1 - x0, y1 - y0];
  }

  getPhysicalBox(paperSize: Vector): [Vector, Vector] {
    return [Bubble.getPhysicalPoint(paperSize, this.n_p0), Bubble.getPhysicalPoint(paperSize, this.n_p1)];
  }

  getPhysicalCenter(paperSize: Vector): Vector {
    const r = this.getPhysicalRect(paperSize);
    return [r[0] + r[2] / 2, r[1] + r[3] / 2];
  }

  getPhysicalSize(paperSize: Vector): Vector {
    const r = this.getPhysicalRect(paperSize);
    return [r[2], r[3]];
  }

  getPhysicalOffset(paperSize: Vector): Vector {
    return Bubble.denormalizedPosition(paperSize, this.n_offset);
  }

  getPhysicalFontSize(paperSize: Vector): number {
    return this.n_fontSize / Bubble.getUnit(paperSize);
  }

  getPhysicalStrokeWidth(paperSize: Vector): number {
    return this.n_strokeWidth / Bubble.getUnit(paperSize);
  }

  getPhysicalOutlineWidth(paperSize: Vector): number {
    return this.n_outlineWidth / Bubble.getUnit(paperSize);
  }

  getPhysicalRegularizedRect(paperSize: Vector): Rect {
    const [p0, p1] = this.regularized();
    const [x0, y0] = Bubble.getPhysicalPoint(paperSize, p0);
    const [x1, y1] = Bubble.getPhysicalPoint(paperSize, p1);
    return [x0, y0, x1 - x0, y1 - y0];
  }

  getPhysicalRegularizedBox(paperSize: Vector): [Vector, Vector] {
    const [n_p0, n_p1] = this.regularized();
    return [Bubble.getPhysicalPoint(paperSize, n_p0), Bubble.getPhysicalPoint(paperSize, n_p1)];
  }

  hasEnoughSize(paperSize: Vector): boolean {
    const r = this.getPhysicalRect(paperSize);
    return minimumBubbleSize <= r[2] && minimumBubbleSize <= r[3];
  }

  static enoughSize(size: Vector): Vector {
    return [
      Math.max(size[0], minimumBubbleSize + 1),
      Math.max(size[1], minimumBubbleSize + 1),
    ];
  }

  setPhysicalCenter(paperSize: Vector, p: Vector) {
    const [x, y] = p;
    const [w, h] = this.getPhysicalSize(paperSize);
    this.n_p0 = Bubble.normalizedPosition(paperSize, [x - w / 2, y - h / 2]);
    this.n_p1 = Bubble.normalizedPosition(paperSize, [x + w / 2, y + h / 2]);
  }

  setPhysicalSize(paperSize:Vector, size: Vector) {
    const center = [(this.n_p0[0] + this.n_p1[0]) / 2, (this.n_p0[1] + this.n_p1[1]) / 2];
    this.n_p0 = [center[0] - size[0] / paperSize[0] / 2, center[1] - size[1] / paperSize[1] / 2];
    this.n_p1 = [center[0] + size[0] / paperSize[0] / 2, center[1] + size[1] / paperSize[1] / 2];
  }

  setPhysicalRect(paperSize: Vector, rect: Rect) {
    this.n_p0 = [rect[0] / paperSize[0], rect[1] / paperSize[1]];
    this.n_p1 = [(rect[0] + rect[2]) / paperSize[0], (rect[1] + rect[3]) / paperSize[1]];
  }

  setPhysicalFontSize(paperSize: Vector, n: number) {
    this.n_fontSize = n * Bubble.getUnit(paperSize);
  }

  setPhysicalStrokeWidth(paperSize: Vector, n: number) {
    this.n_strokeWidth = n * Bubble.getUnit(paperSize);
  }

  setPhysicalOutlineWidth(paperSize: Vector, n: number) {
    this.n_outlineWidth = n * Bubble.getUnit(paperSize);
  }

  setPhysicalOffset(paperSize: Vector, p: Vector) {
    this.n_offset = Bubble.normalizedPosition(paperSize, p);
  }

  forceEnoughSize(paperSize: Vector) {
    const r = this.getPhysicalRect(paperSize);
    const enoughSize = Bubble.enoughSize([r[2], r[3]]);
    this.setPhysicalSize(paperSize, enoughSize);
  }

  contains(paperSize, p: Vector): boolean {
    const [x, y] = p;
    const [x0, y0] = Bubble.getPhysicalPoint(paperSize, this.n_p0);
    const [x1, y1] = Bubble.getPhysicalPoint(paperSize, this.n_p1);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  getHandleAt(paperSize: Vector, p: Vector): BubbleBorderHandle {
    const handles: BubbleBorderHandle[] = [
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
      const rect = this.getHandleRect(paperSize, handle);
      if (rectContains(rect, p)) {
        return handle;
      }
    }
    return null;
  }

  getHandleRect(paperSize: Vector, handle: BubbleBorderHandle): Rect {
    const [x, y, w, h] = this.getPhysicalRect(paperSize);

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
    const p0: Vector = [Math.min(this.n_p0[0], this.n_p1[0]), Math.min(this.n_p0[1], this.n_p1[1])];
    const p1: Vector = [Math.max(this.n_p0[0], this.n_p1[0]), Math.max(this.n_p0[1], this.n_p1[1])];
    return [p0, p1];
  }

  regularize(): void {
    [this.n_p0, this.n_p1] = this.regularized();
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

  static normalizedPosition(paperSize: Vector, p: Vector): Vector {
    return [p[0] / paperSize[0], p[1] / paperSize[1]];
  }

  static denormalizedPosition(paperSize: Vector, p: Vector): Vector {
    return [p[0] * paperSize[0], p[1] * paperSize[1]];
  }

  get imageSize(): Vector {
    return [this.image?.image.width, this.image?.image.height];
  }  

  get optionSet(): any {
    return bubbleOptionSets[this.shape];
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
