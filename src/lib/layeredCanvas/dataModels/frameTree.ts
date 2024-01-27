import { type Vector, type Rect, intersection, line, line2, deg2rad } from "../tools/geometry/geometry";
import { trapezoidBoundingRect, type Trapezoid, isPointInTrapezoid } from "../tools/geometry/trapezoid";
import type { ImageFile } from "./imageFile";

export type Padding = { top: number, bottom: number, left: number, right: number};
export type Border = { layout: Layout, index: number, trapezoid: Trapezoid };
export type PaddingHandle = { layout: Layout, handle: 'top' | 'bottom' | 'left' | 'right', trapezoid: Trapezoid };

export type Layout = {
  size: Vector;
  origin: Vector;
  rawSize: Vector;
  rawOrigin: Vector;
  children?: Layout[];
  element?: FrameElement;
  dir?: 'h' | 'v';
  corners?: Trapezoid;
};

export class FrameElement {
  rawSize: number;
  direction: 'h' | 'v' | null;
  children: FrameElement[];
  localLength: number; // 主軸サイズ
  localBreadth: number; // 交差軸サイズ
  divider: { spacing: number, slant: number };
  padding: { top: number, bottom: number, left: number, right: number};
  translation: [number, number];
  scale: [number, number];
  rotation: number;
  reverse: [number, number];
  bgColor: string | null;
  borderColor: string | null;
  borderWidth: number | null;
  z: number;
  visibility: number;
  semantics: string | null;
  prompt: string | null;
  gallery: ImageFile[];
  showsScribble: boolean;

  image: ImageFile;
  scribble: ImageFile;
  focused: boolean;

  constructor(size: number) {
    // 保持するのは兄弟間でのみ有効な相対サイズ（ローカル座標）
    // 絶対座標はレンダリング時に算出する
    this.rawSize = size;
    this.direction = null;
    this.children = [];
    this.localLength = 0;
    this.localBreadth = 0;
    this.divider = { spacing: 0, slant: 0 };
    this.padding = { top: 0, bottom: 0, left: 0, right: 0};
    this.translation = [0, 0];
    this.scale = [1, 1]; 
    this.rotation = 0;
    this.reverse = [1, 1];
    this.bgColor = null;
    this.borderColor = null;
    this.borderWidth = null;
    this.z = 0;
    this.visibility = 2;
    this.prompt = ["1 dog", "1 cat", "1 rabbit", "1 elephant", "1 dolphin", "1 bird"][Math.floor(Math.random() * 6)];
    this.gallery = [];
    this.showsScribble = true;
    this.semantics = null;

    // リーフ要素の場合は絵がある可能性がある
    this.image = null;
    this.scribble = null;
    this.focused = false;
  }

  clone(): FrameElement {
    const element = new FrameElement(this.rawSize);
    element.direction = this.direction;
    element.children = this.children.map(child => child.clone());
    element.localLength = this.localLength;
    element.localBreadth = this.localBreadth;
    element.divider = { ...this.divider };
    element.padding = { ...this.padding };
    element.translation = [...this.translation];
    element.scale = [...this.scale];
    element.rotation = this.rotation;
    element.reverse = [...this.reverse];
    element.bgColor = this.bgColor;
    element.borderColor = this.borderColor;
    element.borderWidth = this.borderWidth;
    element.image = this.image;
    element.scribble = this.scribble;
    element.gallery = [...this.gallery];
    element.z = this.z;
    element.visibility = this.visibility;
    element.semantics = this.semantics;
    element.prompt = this.prompt;
    element.showsScribble = this.showsScribble;
    return element;
  }

  static compile(markUp: any): FrameElement {
    const element = FrameElement.compileNode(markUp);

    const children = markUp.column || markUp.row;
    if (children) {
      element.direction = markUp.column ? 'v' : 'h';
      element.children = children.map(child => this.compile(child));
      element.calculateLengthAndBreadth();
    }

    return element;
  }

  static compileNode(markUp: any): FrameElement {
    const element = new FrameElement(markUp.width ?? markUp.height ?? markUp.size ?? 1);
    element.divider = { 
      spacing: markUp.divider?.spacing ?? 0, 
      slant: markUp.divider?.slant ?? 0 
    };
    element.padding = { top:0, bottom:0, left:0, right:0 };
    Object.assign(element.padding, markUp.padding ?? {});
    element.bgColor = markUp.bgColor;
    element.borderColor = markUp.borderColor;
    element.borderWidth = markUp.borderWidth;
    element.z = markUp.z ?? 0;
    element.visibility = markUp.visibility ?? 2;
    element.semantics = markUp.semantics;
    element.prompt = markUp.prompt ?? ["1 dog", "1 cat", "1 rabbit", "1 elephant", "1 dolphin", "1 bird"][Math.floor(Math.random() * 6)];
    element.showsScribble = markUp.showsScribble ?? true;

    const children = markUp.column ?? markUp.row;
    if (!children) {
      element.translation = markUp.translation ?? [0, 0];
      element.scale = markUp.scale ?? [1, 1]; 
      element.rotation = markUp.rotation ?? 0;
      element.reverse = markUp.reverse ?? [1, 1];
    }

    return element;
  }

  static decompile(element: FrameElement): any {
    return this.decompileAux(element, 'v');
  }

  static decompileAux(element, parentDir) {
    const markUpElement = this.decompileNode(element, parentDir);
    if (element.direction) {
      const dir = element.direction == 'h' ? 'row' : 'column';
      markUpElement[dir] = [];
      for (let i = 0; i < element.children.length; i++) {
        markUpElement[dir].push(this.decompileAux(element.children[i], element.direction));
      }
    }
    return markUpElement;
  }

  static decompileNode(element: FrameElement, parentDir: 'h' | 'v'): any {
    function cleanPadding(mm: Padding) {
      const m: any = {};
      if (mm.top !== 0) { m.top = mm.top; }
      if (mm.bottom !== 0) { m.bottom = mm.bottom; }
      if (mm.left !== 0) { m.left = mm.left; }
      if (mm.right !== 0) { m.right = mm.right; }
      if (Object.keys(m).length === 0) { return undefined; }
      return m;
    }

    const markUpElement: any = {};
    if (element.bgColor) { markUpElement.bgColor = element.bgColor; }
    if (element.borderColor) { markUpElement.borderColor = element.borderColor; }
    if (element.borderWidth) { markUpElement.borderWidth = element.borderWidth; }
    if (element.z && element.z !== 0) { markUpElement.z = element.z; }
    if (element.visibility !== 2) { markUpElement.visibility = element.visibility; }
    if (element.semantics) { markUpElement.semantics = element.semantics; }
    if (element.prompt) { markUpElement.prompt = element.prompt; }
    if (element.showsScribble !== true) { markUpElement.showsScribble = element.showsScribble; }
    if (element.direction) {
      const dir = element.direction == 'h' ? 'row' : 'column';
      markUpElement[dir] = [];
      for (let i = 0; i < element.children.length; i++) {
        markUpElement[dir].push(this.decompileAux(element.children[i], element.direction));
      }
    } else {
      if (element.translation[0] !== 0 || element.translation[1] !== 0) {
        markUpElement.translation = element.translation;
      }
      if (element.scale[0] !== 1 || element.scale[1] !== 1) {
        markUpElement.scale = element.scale;
      }
      if (element.rotation !== 0) {
        markUpElement.rotation = element.rotation;
      }
      if (element.reverse[0] !== 1 || element.reverse[1] !== 1) {
        markUpElement.reverse = element.reverse;
      }
    }
    if (element.divider.spacing !== 0 || element.divider.slant !== 0) {
      markUpElement.divider = {};
      if (element.divider.spacing !== 0) {
        markUpElement.divider.spacing = element.divider.spacing;
      }
      if (element.divider.slant !== 0) {
        markUpElement.divider.slant = element.divider.slant;
      }
    }
    const padding = cleanPadding(element.padding);
    if (padding) {
      markUpElement.padding = padding;
    }
    if (parentDir == 'h') {
      markUpElement.width = element.rawSize;
    } else {
      markUpElement.height = element.rawSize;
    }
    if (element.direction) {
      markUpElement.padding = cleanPadding(element.padding);
    }

    return markUpElement;
  }

  static findParent(root: FrameElement, target: FrameElement): FrameElement {
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      if (child == target) {
        return root;
      } else {
        const parent = this.findParent(child, target);
        if (parent) {
          return parent;
        }
      }
    }
    return null;
  }

  static eraseElement(root: FrameElement, target: FrameElement): void {
    const parent = this.findParent(root, target);
    if (parent) {
      if (parent.children.length === 1) { 
        // 兄弟がいない場合は親を削除する
        this.eraseElement(root, parent);
      } else {
        // 兄弟がいる場合は親から削除する
        const index = parent.children.indexOf(target);
        parent.children.splice(index, 1);
        parent.calculateLengthAndBreadth();
      }
    }
    // ルート要素は削除できない
  }

  static duplicateElement(root: FrameElement, target: FrameElement): void {
    console.log('duplicateElement', root, target);
    const parent = this.findParent(root, target);
    if (parent) {
      const index = parent.children.indexOf(target);
      const newElement = target.clone();
      newElement.calculateLengthAndBreadth();
      parent.children.splice(index+1, 0, newElement);
      parent.calculateLengthAndBreadth();
    }
    // ルート要素は複製できない(ことにしておく)
  }

  static splitElementHorizontal(root: FrameElement, target: FrameElement): void {
    this.splitElement(root, target, 'h');
  }

  static splitElementVertical(root: FrameElement, target: FrameElement): void {
    this.splitElement(root, target, 'v');
  }

  static splitElement(root: FrameElement, target: FrameElement, splitDirection: 'h' | 'v'): void {
    const parent = this.findParent(root, target);
    if (parent) {
      const dir = parent.direction;
      console.log(dir, splitDirection);
      if (dir === splitDirection) { 
        console.log("same direction");
        const index = parent.children.indexOf(target);
        const spacing = target.divider.spacing;
        const length = target.rawSize;
        const newElement = target.clone();
        newElement.rawSize = (length - spacing) / 2;
        newElement.divider = {...target.divider};
        newElement.calculateLengthAndBreadth();
        target.rawSize = newElement.rawSize;
        target.divider.spacing = length * 0.05;
        parent.children.splice(index+1, 0, newElement);
        parent.calculateLengthAndBreadth();
      } else {
        console.log("different direction");
        const index = parent.children.indexOf(target);
        const newElement = new FrameElement(target.rawSize);
        const length = target.rawSize;
        newElement.direction = splitDirection;
        for (let i = 0; i < 2; i++) {
          const newChild = target.clone();
          newChild.calculateLengthAndBreadth();
          newElement.children.push(newChild);
        }
        newElement.divider = {...target.divider};
        newElement.children[0].divider.spacing = length * 0.05;
        newElement.calculateLengthAndBreadth();
        parent.children[index] = newElement;
      } 
    } else {
      // target === root
      const newElement = root.clone();
      root.children = [newElement];
      root.direction = splitDirection;
      this.splitElement(root, newElement, splitDirection);
    }
  }

  static transposeDivider(root: FrameElement, target: FrameElement): void {
    const parent = this.findParent(root, target);
    if (parent) {
      const index = parent.children.indexOf(target);
      const divider = parent.children[index].divider;
      if (parent.children.length === 2) {
        parent.direction = parent.direction === 'h' ? 'v' : 'h';
        // 親の親と方向が同じなら埋め込んだほうがいい
        const grandParent = this.findParent(root, parent);
        if (grandParent && grandParent.direction === parent.direction) {
          const grandIndex = grandParent.children.indexOf(parent);
          const l = parent.rawSize;
          const ll = parent.children[0].rawSize + parent.children[1].rawSize + divider.spacing;
          parent.children[0].rawSize = l * parent.children[0].rawSize / ll;
          parent.children[1].rawSize = l * parent.children[1].rawSize / ll;
          parent.children[0].divider = {...divider, spacing: l * divider.spacing / ll};
          parent.children[1].divider = parent.divider;
          grandParent.children.splice(grandIndex, 1, ...parent.children);
          grandParent.calculateLengthAndBreadth();
        }
      } else if (2 < parent.children.length) {
        const nextSibling = parent.children[index+1];
        const size = target.rawSize + divider.spacing + nextSibling.rawSize;
        const newContainer = new FrameElement(target.rawSize);
        newContainer.rawSize = size;
        newContainer.direction = parent.direction === 'h' ? 'v' : 'h';
        newContainer.children.push(target);
        newContainer.children.push(nextSibling);
        newContainer.divider = {...nextSibling.divider};
        newContainer.calculateLengthAndBreadth();
        parent.children.splice(index, 2, newContainer);
      }
    }    
  }

  calculateLengthAndBreadth(): void {
    let totalLength = 0;
    totalLength = 0;
    this.localBreadth = this.rawSize;
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      totalLength += child.rawSize;
      if (i < this.children.length-1) { totalLength += child.divider.spacing; }
    }
    this.localLength = totalLength;
  }

  getLogicalSize(): Vector {
    if (this.direction === 'h') {
      return [this.localLength, this.localBreadth];
    } else if (this.direction === 'v') {
      return [this.localBreadth, this.localLength];
    } else {
      return [this.rawSize, this.rawSize];
    }
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

  static visibilityCandidates = ["none", "background", "full"];
}

function paddedSquare(rawOrigin: Vector, rawSize: Vector, padding: Padding): [Vector, Vector] {
  const origin: Vector = [rawOrigin[0] + padding.left * rawSize[0], rawOrigin[1] + padding.top * rawSize[1]];
  const size: Vector = [rawSize[0] * (1 - padding.left - padding.right), rawSize[1] * (1 - padding.top - padding.bottom)];
  return [origin, size];
}

export function calculatePhysicalLayout(element: FrameElement, rawSize: Vector, rawOrigin: Vector): Layout {
  const [origin, size] = paddedSquare(rawOrigin, rawSize, element.padding);

  const corners: Trapezoid = {
    topLeft: [origin[0], origin[1]],
    topRight: [origin[0] + size[0], origin[1]],
    bottomLeft: [origin[0], origin[1] + size[1]],
    bottomRight: [origin[0] + size[0], origin[1] + size[1]]
  };
  return calculatePhysicalLayoutAux(element, size, origin, corners);
}

function calculatePhysicalLayoutAux(element: FrameElement, size: Vector, origin: Vector, corners: Trapezoid): Layout {
  if (!element.direction) {
    return calculatePhysicalLayoutLeaf(element, size, origin, corners);
  } else {
    return calculatePhysicalLayoutElements(element, size, origin, corners);
  }
}    

function calculatePhysicalLayoutElements(element: FrameElement, rawSize: Vector, rawOrigin: Vector, corners: Trapezoid): Layout {
  const padding = element.padding;
  const [origin, size] = paddedSquare(rawOrigin, rawSize, padding);

  const dir = element.direction;
  const psize = element.localLength;
  const ssize = element.localBreadth;
  const xf = dir == 'h' ? size[0] / psize : size[0] / ssize;
  const yf = dir == 'v' ? size[1] / psize : size[1] / ssize;
  const inner_width = ssize * xf;
  const inner_height = ssize * yf;
  const children = [];
  if (dir == 'h') {
    let x = 0;
    const y = 0;
    const leftmostLine = line(corners.topLeft, corners.bottomLeft, [padding.left, 0]);
    const rightmostLine = line(corners.topRight, corners.bottomRight, [-padding.right, 0]);
    const topLine = line(corners.topLeft, corners.topRight, [0, padding.top]);
    const bottomLine = line(corners.bottomLeft, corners.bottomRight, [0, -padding.bottom]);
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      const childSize: Vector = [child.rawSize * xf, inner_height];
      const childOrigin: Vector = [origin[0] + size[0] - x * xf - childSize[0], origin[1] + y * yf];

      const rightCenter: Vector = [childOrigin[0] + childSize[0], childOrigin[1] + childSize[1] / 2];
      const leftCenter: Vector = [childOrigin[0], childOrigin[1] + childSize[1] / 2];
      const rightLine = i === 0 ? rightmostLine : line2(rightCenter, deg2rad(element.children[i-1].divider.slant + 90));
      const leftLine = i === element.children.length - 1 ? leftmostLine : line2(leftCenter, deg2rad(child.divider.slant + 90));

      const childCorners: Trapezoid = {
        topLeft: intersection(topLine, leftLine),
        topRight: intersection(topLine, rightLine),
        bottomLeft: intersection(bottomLine, leftLine),
        bottomRight: intersection(bottomLine, rightLine),
      }
      children.push(calculatePhysicalLayoutAux(child, childSize, childOrigin, childCorners));
      x += child.rawSize + child.divider.spacing;
    }
  } else {
    const x = 0;
    let y = 0;
    const topmostLine = line(corners.topLeft, corners.topRight, [0, padding.top * rawSize[1]]);
    const bottommostLine = line(corners.bottomLeft, corners.bottomRight, [0, -padding.bottom * rawSize[1]]);
    const leftLine = line(corners.topLeft, corners.bottomLeft, [padding.left * rawSize[0], 0]);
    const rightLine = line(corners.topRight, corners.bottomRight, [-padding.right * rawSize[0], 0]);
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      const childSize: Vector = [inner_width, child.rawSize * yf];
      const childOrigin: Vector = [origin[0] + x * xf, origin[1] + y * yf];
      const topCenter: Vector = [childOrigin[0] + childSize[0] / 2, childOrigin[1]];
      const bottomCenter: Vector = [childOrigin[0] + childSize[0] / 2, childOrigin[1] + childSize[1]];
      const topLine = i === 0 ? topmostLine : line2(topCenter, deg2rad(-element.children[i-1].divider.slant));
      const bottomLine = i === element.children.length - 1 ? bottommostLine : line2(bottomCenter, deg2rad(-child.divider.slant));

      const childCorners = {
        topLeft: intersection(topLine, leftLine),
        topRight: intersection(topLine, rightLine),
        bottomLeft: intersection(bottomLine, leftLine),
        bottomRight: intersection(bottomLine, rightLine),
      }
      children.push(calculatePhysicalLayoutAux(child, childSize, childOrigin, childCorners));
      y += child.rawSize + child.divider.spacing;
    }
  }
  return { size, origin, rawSize, rawOrigin, children, element, dir, corners };
}

function calculatePhysicalLayoutLeaf(element: FrameElement, rawSize: Vector, rawOrigin: Vector, rawCorners: Trapezoid): Layout {
  const padding = element.padding;
  const [origin, size] = paddedSquare(rawOrigin, rawSize, padding);
  const [w, h] = rawSize;

  const topLine = line(rawCorners.topLeft, rawCorners.topRight, [0, padding.top * h]);
  const bottomLine = line(rawCorners.bottomLeft, rawCorners.bottomRight, [0, -padding.bottom * h]);
  const leftLine = line(rawCorners.topLeft, rawCorners.bottomLeft, [padding.left * w, 0]);
  const rightLine = line(rawCorners.topRight, rawCorners.bottomRight, [-padding.right * w, 0]);

  // 長さが0のときは交点を作れない
  const corners = {
    topLeft: intersection(topLine, leftLine) || rawCorners.topLeft,
    topRight: intersection(topLine, rightLine) || rawCorners.topRight,
    bottomLeft: intersection(bottomLine, leftLine) || rawCorners.bottomLeft,
    bottomRight: intersection(bottomLine, rightLine) || rawCorners.bottomRight, 
  }

  return { size, origin, rawSize, rawOrigin, element, corners };
}

export function rectFromSquare(position: Vector, size: Vector): Rect {
  const [x, y] = position;
  const [w, h] = size;
  return [x, y, x + w, y + h];
}

export function findLayoutAt(layout: Layout, position: Vector): Layout {
  return findLayoutAtAux(layout, position, null);
}

export function findLayoutAtAux(layout: Layout, position: Vector, current: Layout): Layout {
  if (layout.children != null) {
    for (let i = 0; i < layout.children.length; i++) {
      const child = layout.children[i];
      current = findLayoutAtAux(child, position, current);
    }
    return current;
  } else {
    if (isPointInTrapezoid(position, layout.corners)) {
      if (current != null && layout.element.z < current.element.z) { 
        return current; 
      }
      return layout;
    } else {
      return current;
    }
  }
}

export function findLayoutOf(layout: Layout, element: FrameElement): Layout {
  if (layout.element === element) {
    return layout;
  }
  if (layout.children) {
    for (let i = 0; i < layout.children.length; i++) {
      const found = findLayoutOf(layout.children[i], element);
      if (found) { return found; }
    }
  }
  return null;
}

export function findBorderAt(layout: Layout, position: Vector): Border {
  const [x,y] = position;

  if (layout.children) {
    for (let i = 1; i < layout.children.length; i++) {
      const bt = makeBorderTrapezoid(layout, i);
      if (isPointInTrapezoid([x, y], bt)) {
        return { layout, index: i, trapezoid: bt };
      }
    }
    for (let i = 0; i < layout.children.length; i++) {
      const found = findBorderAt(layout.children[i], position);
      if (found) { return found; }
    }
    return null;
  }
  return null;
}

export function findPaddingAt(layout: Layout, position: Vector): PaddingHandle {
  const [x,y] = position;

  if (layout.children) {
    for (let i = 0; i < layout.children.length; i++) {
      const found = findPaddingAt(layout.children[i], position);
      if (found) { return found; }
    }
    return null;
  } else {
      return findPaddingOn(layout, position);
  }
}

function findPaddingOn(layout: Layout, position: Vector): PaddingHandle {
  if (layout.element.visibility === 0) { return null; }
  const [x,y] = position;
  for (let handle of ["top", "bottom", "left", "right"]) {
    const paddingTrapezoid = makePaddingTrapezoid(layout, handle);
    if (isPointInTrapezoid([x, y], paddingTrapezoid)) {
      return { layout, handle, trapezoid: paddingTrapezoid } as PaddingHandle;
    }
  }
  return null;
}

export function makePaddingTrapezoid(layout: Layout, handle: string): Trapezoid {
  const PADDING_WIDTH = 20;

  switch (handle) {
    case 'top':
      return trapezoidAroundSegment(layout.corners.topLeft, layout.corners.topRight, PADDING_WIDTH);
    case 'bottom':
      return trapezoidAroundSegment(layout.corners.bottomLeft, layout.corners.bottomRight, PADDING_WIDTH);
    case 'left':
      return trapezoidAroundSegment(layout.corners.topLeft, layout.corners.bottomLeft, PADDING_WIDTH);
    case 'right':
      return trapezoidAroundSegment(layout.corners.topRight, layout.corners.bottomRight, PADDING_WIDTH);
    default:
      return null;
  }
}

function trapezoidAroundSegment(p0: Vector, p1: Vector, width: number): Trapezoid {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / d;
  const ny = dy / d;
  const wx = ny * width;
  const wy = -nx * width;
  return {
    topLeft: [x0 - wx, y0 - wy],
    topRight: [x0 + wx, y0 + wy],
    bottomRight: [x1 + wx, y1 + wy],
    bottomLeft: [x1 - wx, y1 - wy],
  };
}

const BORDER_WIDTH = 10;

export function makeBorderTrapezoid(layout: Layout, index: number): Trapezoid {
  if (layout.dir == 'h') {
    return makeHorizontalBorderTrapezoid(layout, index);
  } else {
    return makeVerticalBorderTrapezoid(layout, index);
  }
}

function makeHorizontalBorderTrapezoid(layout: Layout, index: number): Trapezoid {
  const prev = layout.children[index - 1];
  const curr = layout.children[index];

  const corners: Trapezoid = {
    topLeft: [...curr.corners.topRight],
    topRight: [...prev.corners.topLeft],
    bottomLeft: [...curr.corners.bottomRight],
    bottomRight: [...prev.corners.bottomLeft],
  }
  corners.topLeft[0] -= BORDER_WIDTH;
  corners.topRight[0] += BORDER_WIDTH;
  corners.bottomLeft[0] -= BORDER_WIDTH;
  corners.bottomRight[0] += BORDER_WIDTH;

  return corners;
}

function makeVerticalBorderTrapezoid(layout: Layout, index: number): Trapezoid {
  const prev = layout.children[index - 1];
  const curr = layout.children[index];

  const corners: Trapezoid = {
    topLeft: [...prev.corners.bottomLeft],
    topRight: [...prev.corners.bottomRight],
    bottomLeft: [...curr.corners.topLeft],
    bottomRight: [...curr.corners.topRight],
  }
  corners.topLeft[1] -= BORDER_WIDTH;
  corners.topRight[1] -= BORDER_WIDTH;
  corners.bottomLeft[1] += BORDER_WIDTH;
  corners.bottomRight[1] += BORDER_WIDTH;

  return corners;
}

export type CollectedImage = {
  image: ImageFile,
  translation: Vector,
  scale: Vector,
  rotation: number,
}

export function collectImages(frameTree: FrameElement): CollectedImage[] {
  const images = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility) {
      images.push({
        image: frameTree.image,
        translation: frameTree.translation,
        scale: frameTree.scale,
        rotation: frameTree.rotation,
      });
    }
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      const childImages = collectImages(frameTree.children[i]);
      images.push(...childImages);
    }
  }
  return images;
}

export function dealImages(frameTree: FrameElement, images: CollectedImage[], insertElement: FrameElement, spliceElement: FrameElement): void {
  if (!frameTree.children || frameTree.children.length === 0) {
    if (frameTree.visibility === 0) { return; }

    if (frameTree === spliceElement) {
      images.shift();
    } 
    if (frameTree === insertElement || images.length === 0) {
      frameTree.image = null;
      frameTree.translation = [0, 0];
      frameTree.scale = [1, 1];
      frameTree.rotation = 0;
      return;
    }
    const { image, scale, translation, rotation } = images.shift();
    frameTree.image = image;
    frameTree.translation = translation;
    frameTree.scale = scale;
    frameTree.rotation = rotation;
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      dealImages(frameTree.children[i], images, insertElement, spliceElement);
    }
  }
}

export function collectLeaves(frameTree: FrameElement): FrameElement[] {
  const leaves = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility) {
      leaves.push(frameTree);
    }
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      const childLeaves = collectLeaves(frameTree.children[i]);
      leaves.push(...childLeaves);
    }
  }
  return leaves;
}

export function constraintTree(layout: Layout): void {
  const newLayout = calculatePhysicalLayout(
    layout.element,
    layout.size,
    layout.origin
  );
  constraintRecursive(newLayout);
}

export function constraintRecursive(layout: Layout): void {
  if (layout.children) {
    for (const child of layout.children) {
      constraintRecursive(child);
    }
  } else if (layout.element && (layout.element.image || layout.element.scribble)) {
    constraintLeaf(layout);
  }
}

export function constraintLeaf(layout: Layout): void {
  if (!layout.corners) {return; }
  if (!layout.element.image && !layout.element.scribble) { return; }

  const imageWidth = layout.element.image?.naturalWidth ?? layout.element.scribble?.naturalWidth;
  const imageHeight = layout.element.image?.naturalHeight ?? layout.element.scribble?.naturalHeight;

  const element = layout.element;
  const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);
  const [w, h] = [x1 - x0, y1 - y0];
  const [iw, ih] = [imageWidth, imageHeight];
  console.log('constraintLeaf', iw, ih, w, h, element.scale);

  let scale = element.scale[0];
  if (iw * scale < w) { scale = w / iw; }
  if (ih * scale < h) { scale = h / ih; }
  element.scale = [scale, scale];

  const [rw, rh] = [iw * scale, ih * scale];
  const x = (x0 + x1) * 0.5 + element.translation[0];
  const y = (y0 + y1) * 0.5 + element.translation[1];

  if (x0 < x - rw / 2) { element.translation[0] = - (w - rw) / 2; }
  if (x + rw / 2 < x1) { element.translation[0] = (w - rw) / 2; }
  if (y0 < y - rh / 2) { element.translation[1] = - (h - rh) / 2; }
  if (y1 > y + rh / 2) { element.translation[1] = (h - rh) / 2; }
}
