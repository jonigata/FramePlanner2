import { type Vector, type Rect, intersection, line, line2, deg2rad, isVectorZero, add2D } from "../tools/geometry/geometry";
import { trapezoidBoundingRect, type Trapezoid, isPointInTrapezoid, extendTrapezoid } from "../tools/geometry/trapezoid";
import type { ImageFile } from "./imageFile";
import { type RectHandle, rectHandles } from "../tools/rectHandle";

// formal～はoffsetが含まれない値
export type CornerOffsets = { topLeft: Vector, topRight: Vector, bottomLeft: Vector, bottomRight: Vector };
export type Border = { layout: Layout, index: number, corners: Trapezoid, formalCorners: Trapezoid };
export type PaddingHandle = { layout: Layout, handle: RectHandle, corners: Trapezoid };

export type Layout = {
  size: Vector;
  origin: Vector;
  rawSize: Vector;
  rawOrigin: Vector;
  children?: Layout[];
  element?: FrameElement;
  dir?: 'h' | 'v';
  corners: Trapezoid; // offsetted
  formalCorners: Trapezoid; 
};

export type ImageSlot = {
  image: ImageFile;
  scribble: ImageFile;
  n_scale: number,
  n_translation: Vector,
  rotation: number,
  reverse: [number, number];
  scaleLock: boolean,
}

export class FrameElement {
  rawSize: number;
  direction: 'h' | 'v' | null;
  children: FrameElement[];
  localLength: number; // 主軸サイズ
  localBreadth: number; // 交差軸サイズ
  divider: { spacing: number, slant: number };
  cornerOffsets: CornerOffsets;
  bgColor: string | null;
  borderColor: string | null;
  borderWidth: number | null;
  z: number;
  visibility: number;
  semantics: string | null;
  prompt: string | null;
  gallery: ImageFile[];
  showsScribble: boolean;

  image: ImageSlot | null;
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
    this.cornerOffsets = { topLeft: [0, 0], topRight: [0, 0], bottomLeft: [0, 0], bottomRight: [0, 0] };
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
    this.focused = false;
  }

  clone(): FrameElement {
    const element = new FrameElement(this.rawSize);
    element.direction = this.direction;
    element.children = this.children.map(child => child.clone());
    element.localLength = this.localLength;
    element.localBreadth = this.localBreadth;
    element.divider = { ...this.divider };
    element.cornerOffsets = {
      topLeft: [...this.cornerOffsets.topLeft],
      topRight: [...this.cornerOffsets.topRight],
      bottomLeft: [...this.cornerOffsets.bottomLeft],
      bottomRight: [...this.cornerOffsets.bottomRight],
    };
    element.bgColor = this.bgColor;
    element.borderColor = this.borderColor;
    element.borderWidth = this.borderWidth;
    element.gallery = [...this.gallery];
    element.z = this.z;
    element.visibility = this.visibility;
    element.semantics = this.semantics;
    element.prompt = this.prompt;
    element.showsScribble = this.showsScribble;
    if (this.image) {
      console.log('clone image', this.image);
      element.image = {
        image: this.image.image,
        scribble: this.image.scribble,
        n_translation: [...this.image.n_translation],
        n_scale: this.image.n_scale,
        rotation: this.image.rotation,
        reverse: [...this.image.reverse],
        scaleLock: this.image.scaleLock,
      };
    }
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
    if (markUp.padding) {
      const l = markUp.padding.left ?? 0;
      const t = markUp.padding.top ?? 0;
      const r = markUp.padding.right ?? 0;
      const b = markUp.padding.bottom ?? 0;
      element.cornerOffsets = {
        topLeft: [l, t],
        topRight: [r, t],
        bottomLeft: [l, b],
        bottomRight: [r, b],
      };
    } else if (markUp.cornerOffsets) {
      element.cornerOffsets = {
        topLeft: markUp.cornerOffsets.topLeft ?? [0, 0],
        topRight: markUp.cornerOffsets.topRight ?? [0, 0],
        bottomLeft: markUp.cornerOffsets.bottomLeft ?? [0, 0],
        bottomRight: markUp.cornerOffsets.bottomRight ?? [0, 0]
      };
    } else {
      element.cornerOffsets = { topLeft: [0, 0], topRight: [0, 0], bottomLeft: [0, 0], bottomRight: [0, 0] };
    }
    element.bgColor = markUp.bgColor;
    element.borderColor = markUp.borderColor;
    element.borderWidth = markUp.borderWidth;
    element.z = markUp.z ?? 0;
    element.visibility = markUp.visibility ?? 2;
    element.semantics = markUp.semantics;
    element.prompt = markUp.prompt ?? ["1 dog", "1 cat", "1 rabbit", "1 elephant", "1 dolphin", "1 bird"][Math.floor(Math.random() * 6)];
    element.showsScribble = markUp.showsScribble ?? true;
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
    function cleanCornerOffsets(co: CornerOffsets) {
      const m: any = {
        topLeft: isVectorZero(co.topLeft) ? undefined : co.topLeft,
        topRight: isVectorZero(co.topRight) ? undefined : co.topRight,
        bottomLeft: isVectorZero(co.bottomLeft) ? undefined : co.bottomLeft,
        bottomRight: isVectorZero(co.bottomRight) ? undefined : co.bottomRight,
      };
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
    markUpElement.cornerOffsets = cleanCornerOffsets(element.cornerOffsets);
    if (parentDir == 'h') {
      markUpElement.width = element.rawSize;
    } else {
      markUpElement.height = element.rawSize;
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

  static getPhysicalImageScale(paperSize: Vector, image: HTMLImageElement, n_scale: number): number {
    const imageSize = Math.min(image.naturalWidth, image.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    const scale = pageSize / imageSize
    return n_scale * scale;
  }

  getPhysicalImageScale(paperSize: Vector): number {
    return FrameElement.getPhysicalImageScale(paperSize, this.image.image ?? this.image.scribble, this.image.n_scale);
  }

  setPhysicalImageScale(paperSize: Vector, scale: number): void {
    const image = this.image.image ?? this.image.scribble;
    const imageSize = Math.min(image.naturalWidth, image.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    this.image.n_scale = scale / (pageSize / imageSize);
  }

  static getPhysicalImageTranslation(paperSize: Vector, image: HTMLImageElement, n_translation: Vector): Vector {
    const imageSize = Math.min(image.naturalWidth, image.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    const scale = pageSize / imageSize;
    const translation: Vector = [n_translation[0] * scale, n_translation[1] * scale];
    return translation;
  }

  getPhysicalImageTranslation(paperSize: Vector): Vector {
    return FrameElement.getPhysicalImageTranslation(paperSize, this.image.image ?? this.image.scribble, this.image.n_translation);
  }

  setPhysicalImageTranslation(paperSize: Vector, translation: Vector): void {
    const image = this.image.image ?? this.image.scribble;
    const imageSize = Math.min(image.naturalWidth, image.naturalHeight) ;
    const pageSize = Math.min(paperSize[0], paperSize[1]);
    const scale = pageSize / imageSize;
    this.image.n_translation = [translation[0] / scale, translation[1] / scale];
  }

}

function paddedSquare(rawOrigin: Vector, rawSize: Vector, cornerOffsets: CornerOffsets): [Vector, Vector] {
  const [w, h] = rawSize;
  const topLeft = [rawOrigin[0] + cornerOffsets.topLeft[0] * w, rawOrigin[1] + cornerOffsets.topLeft[1] * h];
  const topRight = [rawOrigin[0] + w - cornerOffsets.topRight[0] * w, rawOrigin[1] + cornerOffsets.topRight[1] * h];
  const bottomLeft = [rawOrigin[0] + cornerOffsets.bottomLeft[0] * w, rawOrigin[1] + h - cornerOffsets.bottomLeft[1] * h];
  const bottomRight = [rawOrigin[0] + w - cornerOffsets.bottomRight[0] * w, rawOrigin[1] + h - cornerOffsets.bottomRight[1] * h];

  const origin: Vector = [Math.min(topLeft[0], bottomLeft[0]), Math.min(topLeft[1], topRight[1])];
  const size: Vector = [Math.max(topRight[0], bottomRight[0]) - origin[0], Math.max(bottomLeft[1], bottomRight[1]) - origin[1]];
  return [origin, size];
}

export function calculatePhysicalLayout(element: FrameElement, rawSize: Vector, rawOrigin: Vector): Layout {
  const [origin, size] = paddedSquare(rawOrigin, rawSize, element.cornerOffsets);

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

export function calculateOffsettedCorners(rawSize: Vector, corners: Trapezoid, offsets: CornerOffsets): Trapezoid {
  function realOffset(offset: Vector): Vector {
    return [offset[0] * rawSize[0], offset[1] * rawSize[1]];
  }

  const offsettedCorners: Trapezoid = {
    topLeft: add2D(corners.topLeft, realOffset(offsets.topLeft)),
    topRight: add2D(corners.topRight, realOffset(offsets.topRight)),
    bottomLeft: add2D(corners.bottomLeft, realOffset(offsets.bottomLeft)),
    bottomRight: add2D(corners.bottomRight, realOffset(offsets.bottomRight)),
  }

  return offsettedCorners;
}

function calculatePhysicalLayoutElements(element: FrameElement, rawSize: Vector, rawOrigin: Vector, corners: Trapezoid): Layout {
  const [origin, size] = paddedSquare(rawOrigin, rawSize, element.cornerOffsets);

  const offsettedCorners = calculateOffsettedCorners(rawSize, corners, element.cornerOffsets);

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
    const leftmostLine = line(offsettedCorners.topLeft, offsettedCorners.bottomLeft);
    const rightmostLine = line(offsettedCorners.topRight, offsettedCorners.bottomRight);
    const topLine = line(offsettedCorners.topLeft, offsettedCorners.topRight);
    const bottomLine = line(offsettedCorners.bottomLeft, offsettedCorners.bottomRight);
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
    const topmostLine = line(offsettedCorners.topLeft, offsettedCorners.topRight);
    const bottommostLine = line(offsettedCorners.bottomLeft, offsettedCorners.bottomRight);
    const leftLine = line(offsettedCorners.topLeft, offsettedCorners.bottomLeft);
    const rightLine = line(offsettedCorners.topRight, offsettedCorners.bottomRight);
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
  return { size, origin, rawSize, rawOrigin, children, element, dir, corners, formalCorners: corners };
}

function calculatePhysicalLayoutLeaf(element: FrameElement, rawSize: Vector, rawOrigin: Vector, formalCorners: Trapezoid): Layout {
  const [origin, size] = paddedSquare(rawOrigin, rawSize, element.cornerOffsets);

  const offsettedCorners = calculateOffsettedCorners(rawSize, formalCorners, element.cornerOffsets);

  const topLine = line(offsettedCorners.topLeft, offsettedCorners.topRight);
  const bottomLine = line(offsettedCorners.bottomLeft, offsettedCorners.bottomRight);
  const leftLine = line(offsettedCorners.topLeft, offsettedCorners.bottomLeft);
  const rightLine = line(offsettedCorners.topRight, offsettedCorners.bottomRight);

  // 長さが0のときは交点を作れない
  const corners = {
    topLeft: intersection(topLine, leftLine) || formalCorners.topLeft,
    topRight: intersection(topLine, rightLine) || formalCorners.topRight,
    bottomLeft: intersection(bottomLine, leftLine) || formalCorners.bottomLeft,
    bottomRight: intersection(bottomLine, rightLine) || formalCorners.bottomRight, 
  }

  return { size, origin, rawSize, rawOrigin, element, corners, formalCorners };
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

export function findBorderAt(layout: Layout, position: Vector, margin: number): Border {
  const [x,y] = position;

  if (layout.children) {
    for (let i = 1; i < layout.children.length; i++) {
      const corners = makeBorderCorners(layout, i, margin);
      if (isPointInTrapezoid([x, y], corners)) {
        const formalCorners = makeBorderFormalCorners(layout, i);
        return { layout, index: i, corners, formalCorners};
      }
    }
    for (let i = 0; i < layout.children.length; i++) {
      const found = findBorderAt(layout.children[i], position, margin);
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

export function findPaddingOn(layout: Layout, position: Vector): PaddingHandle {
  if (layout.element.visibility === 0) { return null; }
  const [x,y] = position;
  for (let handle of rectHandles) {
    const paddingTrapezoid = makePaddingTrapezoid(layout, handle);
    if (isPointInTrapezoid([x, y], paddingTrapezoid)) {
      return { layout, handle, corners: paddingTrapezoid } as PaddingHandle;
    }
  }
  return null;
}

export function findPaddingOf(layout: Layout, handle: RectHandle) {
  const corners = makePaddingTrapezoid(layout, handle);
  return { layout, handle, corners };
}

export function makePaddingTrapezoid(layout: Layout, handle: RectHandle): Trapezoid {
  const PADDING_WIDTH = 20;

  switch (handle) {
    case 'topLeft':
      return trapezoidAroundPoint(layout.corners.topLeft, PADDING_WIDTH);
    case 'topRight':
      return trapezoidAroundPoint(layout.corners.topRight, PADDING_WIDTH);
    case 'bottomLeft':
      return trapezoidAroundPoint(layout.corners.bottomLeft, PADDING_WIDTH);
    case 'bottomRight':
      return trapezoidAroundPoint(layout.corners.bottomRight, PADDING_WIDTH);
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

function trapezoidAroundPoint(p: Vector, width: number): Trapezoid {
  const [x, y] = p;
  return {
    topLeft: [x - width, y - width],
    topRight: [x + width, y - width],
    bottomRight: [x + width, y + width],
    bottomLeft: [x - width, y + width],
  };
}

export function makeBorderFormalCorners(layout: Layout, index: number): Trapezoid {
  if (layout.dir == 'h') {
    return makeHorizontalBorderFormalCorners(layout, index);
  } else {
    return makeVerticalBorderFormalCorners(layout, index);
  }
}

function makeHorizontalBorderFormalCorners(layout: Layout, index: number): Trapezoid {
  const prev = layout.children[index - 1];
  const curr = layout.children[index];

  const corners: Trapezoid = {
    topLeft: [...curr.formalCorners.topRight],
    topRight: [...prev.formalCorners.topLeft],
    bottomLeft: [...curr.formalCorners.bottomRight],
    bottomRight: [...prev.formalCorners.bottomLeft],
  }

  return corners;
}

function makeVerticalBorderFormalCorners(layout: Layout, index: number): Trapezoid {
  const prev = layout.children[index - 1];
  const curr = layout.children[index];

  const corners: Trapezoid = {
    topLeft: [...prev.formalCorners.bottomLeft],
    topRight: [...prev.formalCorners.bottomRight],
    bottomLeft: [...curr.formalCorners.topLeft],
    bottomRight: [...curr.formalCorners.topRight],
  }

  return corners;
}

const BORDER_WIDTH = 10;

export function makeBorderCorners(layout: Layout, index: number, margin: number): Trapezoid {
  if (layout.dir == 'h') {
    return makeHorizontalBorderCorners(layout, index, margin);
  } else {
    return makeVerticalBorderCorners(layout, index, margin);
  }
}

function makeHorizontalBorderCorners(layout: Layout, index: number, margin: number): Trapezoid {
  const prev = layout.children[index - 1];
  const curr = layout.children[index];

  const corners: Trapezoid = {
    topLeft: [...curr.corners.topRight],
    topRight: [...prev.corners.topLeft],
    bottomLeft: [...curr.corners.bottomRight],
    bottomRight: [...prev.corners.bottomLeft],
  }

  return extendTrapezoid(corners, margin, 0);
}

function makeVerticalBorderCorners(layout: Layout, index: number, margin: number): Trapezoid {
  const prev = layout.children[index - 1];
  const curr = layout.children[index];

  const corners: Trapezoid = {
    topLeft: [...prev.corners.bottomLeft],
    topRight: [...prev.corners.bottomRight],
    bottomLeft: [...curr.corners.topLeft],
    bottomRight: [...curr.corners.topRight],
  }

  return extendTrapezoid(corners, 0, margin);
}

export function collectImages(frameTree: FrameElement): ImageSlot[] {
  const images = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility) {
      images.push(frameTree.image);
    }
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      const childImages = collectImages(frameTree.children[i]);
      images.push(...childImages);
    }
  }
  return images;
}

export function dealImages(frameTree: FrameElement, images: ImageSlot[], insertElement: FrameElement, spliceElement: FrameElement): void {
  if (!frameTree.children || frameTree.children.length === 0) {
    if (frameTree.visibility === 0) { return; }

    if (frameTree === spliceElement) {
      images.shift();
    } 
    if (frameTree === insertElement || images.length === 0) {
      frameTree.image = null;
      return;
    }
    const image = images.shift();
    frameTree.image = {...image};
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

export function constraintTree(paperSize: Vector, layout: Layout): void {
  const newLayout = calculatePhysicalLayout(
    layout.element,
    layout.size,
    layout.origin
  );
  constraintRecursive(paperSize, newLayout);
}

export function constraintRecursive(paperSize: Vector, layout: Layout): void {
  if (layout.children) {
    for (const child of layout.children) {
      constraintRecursive(paperSize,child);
    }
  } else if (layout.element && layout.element.image) {
    constraintLeaf(paperSize, layout);
  }
}

export function constraintLeaf(paperSize: Vector, layout: Layout): void {
  if (!layout.corners) {return; }
  if (!layout.element.image) { return; }

  const image = layout.element.image.image ?? layout.element.image.scribble;

  const element = layout.element;
  const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
  const [x1, y1] = [x0 + w, y0 + h];
  const [iw, ih] = [image.naturalWidth, image.naturalHeight];

  let scale = element.getPhysicalImageScale(paperSize);
  if (iw * scale < w) { scale = w / iw; }
  if (ih * scale < h) { scale = h / ih; }
  element.setPhysicalImageScale(paperSize, scale);

  const [rw, rh] = [iw * scale, ih * scale];
  const [rw2, rh2] = [rw / 2, rh / 2];
  const translation = element.getPhysicalImageTranslation(paperSize);
  const x = x0 + w * 0.5 + translation[0];
  const y = y0 + h * 0.5 + translation[1];

  if (x0 < x - rw2) { translation[0] = - (w - rw) / 2; }
  if (x + rw2 < x1) { translation[0] = (w - rw) / 2; }
  if (y0 < y - rh2) { translation[1] = - (h - rh) / 2; }
  if (y1 > y + rh2) { translation[1] = (h - rh) / 2; }
  element.setPhysicalImageTranslation(paperSize, translation);
}
