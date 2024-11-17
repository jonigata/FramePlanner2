import { type Vector, lineIntersection, line, line2, deg2rad, isVectorZero, add2D, computeConstraintedRect, getRectCenter, translateRect } from "../tools/geometry/geometry";
import { trapezoidBoundingRect, type Trapezoid, isPointInTrapezoid, extendTrapezoid, pointToQuadrilateralDistance } from "../tools/geometry/trapezoid";
import { type RectHandle, rectHandles } from "../tools/rectHandle";
import { type Film, FilmStack, calculateMinimumBoundingRect, FilmStackTransformer } from "./film";
import { ImageMedia } from "./media";

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
  element: FrameElement;
  dir: 'h' | 'v' | null;
  corners: Trapezoid; // offsetted
  formalCorners: Trapezoid; 
};

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
  pseudo: boolean; // 4コマタイトルなどの擬似要素、流し込みやバッチ処理のときに無視する
  filmStack: FilmStack;

  // 以下は揮発性
  gallery: HTMLCanvasElement[];
  focused: boolean;
  residenceTime: number;

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
    this.pseudo = false;
    this.semantics = null;

    // リーフ要素の場合は絵がある可能性がある
    this.filmStack = new FilmStack();

    // 以下揮発性
    this.gallery = [];
    this.focused = false;
    this.residenceTime = 0;
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
    element.z = this.z;
    element.visibility = this.visibility;
    element.semantics = this.semantics;
    element.prompt = this.prompt;

    element.filmStack = new FilmStack();
    element.filmStack.films =  this.filmStack.films.map(film => film.clone());

    element.residenceTime = this.residenceTime;

    return element;
  }

  static compile(markUp: any): FrameElement {
    const element = FrameElement.compileNode(markUp);

    const children = markUp.column || markUp.row;
    if (children) {
      element.direction = markUp.column ? 'v' : 'h';
      element.children = children.map((child: FrameElement) => this.compile(child));
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
    element.pseudo = markUp.pseudo ?? false;
    return element;
  }

  static decompile(element: FrameElement): any {
    return this.decompileAux(element, 'v');
  }

  static decompileAux(element: FrameElement, parentDir: 'h' | 'v'): any {
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
    if (element.pseudo) { markUpElement.pseudo = true; }
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

  static findElement(root: FrameElement, f: (e: FrameElement) => boolean): FrameElement | null {
    if (f(root)) {
      return root;
    } else {
      for (let i = 0; i < root.children.length; i++) {
        const child = this.findElement(root.children[i], f);
        if (child) {
          return child;
        }
      }
    }
    return null;
  }

  static findParent(root: FrameElement, target: FrameElement): FrameElement | null {
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

  isAuthentic(): boolean {
    return 0 < this.visibility && !this.pseudo
  }

  insertElement(index: number) {
    const parent = this;

    let totalSize = 0;
    for (let i = 0; i < parent.children.length; i++) {
      totalSize += parent.children[i].rawSize;
    }
    const avgSize = totalSize / parent.children.length;

    let totalDivider = 0;
    for (let i = 0; i < parent.children.length-1; i++) {
      totalDivider += parent.children[i].divider.spacing;
    }
    const avgDivider = totalDivider / (parent.children.length-1);
    console.log("insertElement", avgSize, avgDivider);
    
    const newElement = new FrameElement(avgSize);
    newElement.divider = { spacing: avgDivider, slant: 0 };
    newElement.calculateLengthAndBreadth();
    parent.children.splice(index, 0, newElement);
    parent.calculateLengthAndBreadth();
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
        topLeft: lineIntersection(topLine, leftLine)!,
        topRight: lineIntersection(topLine, rightLine)!,
        bottomLeft: lineIntersection(bottomLine, leftLine)!,
        bottomRight: lineIntersection(bottomLine, rightLine)!,
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

      const childCorners: Trapezoid = {
        topLeft: lineIntersection(topLine, leftLine)!,
        topRight: lineIntersection(topLine, rightLine)!,
        bottomLeft: lineIntersection(bottomLine, leftLine)!,
        bottomRight: lineIntersection(bottomLine, rightLine)!,
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
    topLeft: lineIntersection(topLine, leftLine) || formalCorners.topLeft,
    topRight: lineIntersection(topLine, rightLine) || formalCorners.topRight,
    bottomLeft: lineIntersection(bottomLine, leftLine) || formalCorners.bottomLeft,
    bottomRight: lineIntersection(bottomLine, rightLine) || formalCorners.bottomRight, 
  }

  return { size, origin, rawSize, rawOrigin, element, corners, formalCorners, dir: null };
}

export function findLayoutAt(layout: Layout, point: Vector, margin: number, current: Layout | null = null): Layout | null {
  const layoutlets = collectLayoutlets(layout);
  layoutlets.sort((a, b) => a.element.z - b.element.z);
  layoutlets.reverse();

  let result = null;
  let distance = Infinity;

  // currentがあってcurrentにヒットする場合、それより奥のものを返す
  let selectableFlag = true;
  if (current) {
    const d = pointToQuadrilateralDistance(point, current.corners, false);
    if (d <= margin) {
      selectableFlag = false;
    }
  }
  let index = 0;
  for (let layoutlet of layoutlets) {
    index++;
    if (!selectableFlag) { 
      if (layoutlet.element === current?.element) {
        selectableFlag = true;
      }
      continue; 
    }
    const d = pointToQuadrilateralDistance(point, layoutlet.corners, false);
    if (d <= margin && d < distance) {
      distance = d;
      result = layoutlet;
    }
  }
  return result;
}

export function listLayoutsAt(layout: Layout, point: Vector, margin: number): Layout[] {
  const layoutlets = collectLayoutlets(layout);
  layoutlets.sort((a, b) => a.element.z - b.element.z);
  layoutlets.reverse();

  const results = [];
  for (let layoutlet of layoutlets) {
    const d = pointToQuadrilateralDistance(point, layoutlet.corners, false);
    if (d <= margin) {
      results.push(layoutlet);
    }
  }
  return results;
}

function collectLayoutlets(layout: Layout): Layout[] {
  const layouts: Layout[] = [];;

  if (layout.children) {
    for (let i = 0; i < layout.children.length; i++) {
      const childLayouts = collectLayoutlets(layout.children[i]);
      layouts.push(...childLayouts);
    }
  } else {
    layouts.push(layout);
  }

  return layouts;
}

export function findLayoutOf(layout: Layout, element: FrameElement): Layout | null {
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

export function findBorderAt(layout: Layout, point: Vector, margin: number): Border | null {
  if (layout.children) {
    for (let i = 1; i < layout.children.length; i++) {
      const corners = makeBorderCorners(layout, i, 0);
      const q = pointToQuadrilateralDistance(point, corners, true);
      if (q <= margin) {
        const formalCorners = makeBorderFormalCorners(layout, i);
        return { layout, index: i, corners, formalCorners};
      }
    }
    for (let i = 0; i < layout.children.length; i++) {
      const found = findBorderAt(layout.children[i], point, margin);
      if (found) { return found; }
    }
  }
  return null;
}

export function findPaddingAt(layout: Layout, position: Vector, innerWidth: number, outerWidth: number): PaddingHandle | null {
  const [x,y] = position;

  if (layout.children) {
    for (let i = 0; i < layout.children.length; i++) {
      const found = findPaddingAt(layout.children[i], position, innerWidth, outerWidth);
      if (found) { return found; }
    }
    return null;
  } else {
      return findPaddingOn(layout, position, innerWidth, outerWidth);
  }
}

export function findPaddingOn(layout: Layout, position: Vector, innerWidth: number, outerWidth: number): PaddingHandle | null {
  if (layout.element.visibility === 0) { return null; }
  const [x,y] = position;
  for (let handle of rectHandles) {
    const paddingTrapezoid = makePaddingTrapezoid(layout, handle, innerWidth, outerWidth);
    if (isPointInTrapezoid([x, y], paddingTrapezoid)) {
      return { layout, handle, corners: paddingTrapezoid } as PaddingHandle;
    }
  }
  return null;
}

export function findPaddingOf(layout: Layout, handle: RectHandle, innerWidth: number, outerWidth: number) {
  const corners = makePaddingTrapezoid(layout, handle, innerWidth, outerWidth);
  return { layout, handle, corners };
}

export function makePaddingTrapezoid(layout: Layout, handle: RectHandle, innerWidth: number, outerWidth: number): Trapezoid {
  switch (handle) {
    case 'topLeft':
      {
        const [x, y] = layout.corners.topLeft;
        return {
          topLeft: [x - outerWidth, y - outerWidth],
          topRight: [x + innerWidth, y - outerWidth],
          bottomRight: [x + innerWidth, y + innerWidth],
          bottomLeft: [x - outerWidth, y + innerWidth],
        };
      }
    case 'topRight':
      {
        const [x, y] = layout.corners.topRight;
        return {
          topLeft: [x - innerWidth, y - outerWidth],
          topRight: [x + outerWidth, y - outerWidth],
          bottomRight: [x + outerWidth, y + innerWidth],
          bottomLeft: [x - innerWidth, y + innerWidth],
        };
      }
    case 'bottomLeft':
      {
        const [x, y] = layout.corners.bottomLeft;
        return {
          topLeft: [x - outerWidth, y - innerWidth],
          topRight: [x + innerWidth, y - innerWidth],
          bottomRight: [x + innerWidth, y + outerWidth],
          bottomLeft: [x - outerWidth, y + outerWidth],
        };
      }
    case 'bottomRight':
      {
        const [x, y] = layout.corners.bottomRight;
        return {
          topLeft: [x - innerWidth, y - innerWidth],
          topRight: [x + outerWidth, y - innerWidth],
          bottomRight: [x + outerWidth, y + outerWidth],
          bottomLeft: [x - innerWidth, y + outerWidth],
        };
      }
    case 'top':
      return trapezoidAroundSegment(layout.corners.topLeft, layout.corners.topRight, outerWidth, innerWidth);
    case 'bottom':
      return trapezoidAroundSegment(layout.corners.bottomRight, layout.corners.bottomLeft, outerWidth, innerWidth);
    case 'left':
      return trapezoidAroundSegment(layout.corners.bottomLeft, layout.corners.topLeft, outerWidth, innerWidth);
    case 'right':
      return trapezoidAroundSegment(layout.corners.topRight, layout.corners.bottomRight, outerWidth, innerWidth);
  }
}

function trapezoidAroundSegment(p0: Vector, p1: Vector, leftWidth: number, rightWidth: number): Trapezoid {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / d;
  const ny = dy / d;
  const wx = ny * leftWidth;
  const wy = -nx * leftWidth;
  const ex = ny * -rightWidth;
  const ey = -nx * -rightWidth;
  return {
    topLeft: [x0 + wx, y0 + wy],
    topRight: [x1 + wx, y1 + wy],
    bottomRight: [x1 + ex, y1 + ey],
    bottomLeft: [x0 + ex, y0 + ey],
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
  const prev = layout.children![index - 1];
  const curr = layout.children![index];

  const corners: Trapezoid = {
    topLeft: [...curr.formalCorners.topRight],
    topRight: [...prev.formalCorners.topLeft],
    bottomLeft: [...curr.formalCorners.bottomRight],
    bottomRight: [...prev.formalCorners.bottomLeft],
  }

  return corners;
}

function makeVerticalBorderFormalCorners(layout: Layout, index: number): Trapezoid {
  const prev = layout.children![index - 1];
  const curr = layout.children![index];

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
  const prev = layout.children![index - 1];
  const curr = layout.children![index];

  const corners: Trapezoid = {
    topLeft: [...curr.corners.topRight],
    topRight: [...prev.corners.topLeft],
    bottomLeft: [...curr.corners.bottomRight],
    bottomRight: [...prev.corners.bottomLeft],
  }

  return extendTrapezoid(corners, margin, 0);
}

function makeVerticalBorderCorners(layout: Layout, index: number, margin: number): Trapezoid {
  const prev = layout.children![index - 1];
  const curr = layout.children![index];

  const corners: Trapezoid = {
    topLeft: [...prev.corners.bottomLeft],
    topRight: [...prev.corners.bottomRight],
    bottomLeft: [...curr.corners.topLeft],
    bottomRight: [...curr.corners.topRight],
  }

  return extendTrapezoid(corners, 0, margin);
}

export function collectImages(frameTree: FrameElement): FilmStack[] {
  const images = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility) {
      images.push(frameTree.filmStack);
    }
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      const childImages = collectImages(frameTree.children[i]);
      images.push(...childImages);
    }
  }
  return images;
}

export function dealImages(frameTree: FrameElement, filmStacks: FilmStack[], insertElement: FrameElement, spliceElement: FrameElement): void {
  if (!frameTree.children || frameTree.children.length === 0) {
    if (frameTree.visibility === 0) { return; }

    if (frameTree === spliceElement) {
      filmStacks.shift();
    } 
    if (frameTree === insertElement || filmStacks.length === 0) {
      frameTree.filmStack = new FilmStack();
      return;
    }
    const filmStack = filmStacks.shift()!;
    frameTree.filmStack = filmStack;
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      dealImages(frameTree.children[i], filmStacks, insertElement, spliceElement);
    }
  }
}

export function collectLeaves(frameTree: FrameElement): FrameElement[] {
  const leaves = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    if (0 < frameTree.visibility && !frameTree.pseudo) {
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
  } else if (layout.element) {
    constraintLeaf(paperSize, layout);
  }
}

export function constraintLeaf(paperSize: Vector, layout: Layout): void {
  if (!layout.corners) {return; }
  if (layout.element.filmStack.films.length == 0) { return; }

  const films = layout.element.filmStack.getOperationTargetFilms();
  constraintFilms(paperSize, layout, films);
}

export function constraintFilms(paperSize: Vector, layout: Layout, films: Film[]): void {
  if (!layout.corners) {return; }

  const constraintRect = trapezoidBoundingRect(layout.corners);
  const constraintCenter = getRectCenter(constraintRect);
  const mergedRect = calculateMinimumBoundingRect(paperSize, films)!;

  const { scale: targetScale, translation: targetTranslation } = computeConstraintedRect(
    translateRect(mergedRect, constraintCenter),
    constraintRect);

  const rootMatrix = new DOMMatrix();
  rootMatrix.scaleSelf(targetScale, targetScale);
  rootMatrix.translateSelf(...targetTranslation);

  films.forEach(film => {
    const m = rootMatrix.multiply(film.makeMatrix(paperSize));
    const scale = Math.sqrt(m.a * m.a + m.b * m.b);
    film.setShiftedScale(paperSize, scale);
    film.setShiftedTranslation(paperSize, [m.e, m.f]);
  });
}

export function insertFilms(root: FrameElement, paperSize: Vector, element: FrameElement, index: number, films: Film[]): void {
  const pageLayout = calculatePhysicalLayout(root, paperSize, [0,0]);
  const layout = findLayoutOf(pageLayout, element)!;

  const transformer = new FilmStackTransformer(paperSize, films);
  transformer.scale(0.01);
  constraintFilms(paperSize, layout, films);

  element.filmStack.films.splice(index, 0, ...films);

  for (const film of films) {     
    const media = film.media;
    if (media instanceof ImageMedia) {
      element.gallery.push(media.drawSource);
    }
  }
}
