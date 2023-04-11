export class FrameElement {
    constructor(size) {
        // 保持するのは兄弟間でのみ有効な相対サイズ（ローカル座標）
        // 絶対座標はレンダリング時に算出する
        this.rawSize = size;
        this.direction = null;
        this.children = [];
        this.localLength = 0; // 主軸サイズ
        this.localBreadth = 0; // 交差軸サイズ
        this.divider = { spacing: 0, slant: 0 };
        this.padding = { top: 0, bottom: 0, left: 0, right: 0};
        this.translation = [0, 0];
        this.scale = [1, 1]; 
        this.reverse = [1, 1];
        this.bgColor = null;
        this.borderColor = null;
        this.borderWidth = null;
        this.z = 0;
        this.visibility = 2;

        // リーフ要素の場合は絵がある可能性がある
        this.image = null;
    }

    clone() {
        const element = new FrameElement(this.rawSize);
        element.direction = this.direction;
        element.children = this.children.map(child => child.clone());
        element.localLength = this.localLength;
        element.localBreadth = this.localBreadth;
        element.divider = { ...this.divider };
        element.padding = { ...this.padding };
        element.translation = [...this.translation];
        element.scale = [...this.scale];
        element.reverse = [...this.reverse];
        element.bgColor = this.bgColor;
        element.borderColor = this.borderColor;
        element.borderWidth = this.borderWidth;
        element.image = this.image;
        element.z = this.z;
        element.visibility = this.visibility;
        return element;
    }

    static compile(markUpElement) {
        const element = new FrameElement(markUpElement.width || markUpElement.height || markUpElement.size || 1);
        const children = markUpElement.column || markUpElement.row;
        element.divider = { 
            spacing: markUpElement?.divider?.spacing ?? 0, 
            slant: markUpElement?.divider?.slant ?? 0 
        };
        element.padding = {top:0, bottom:0, left:0, right:0};
        Object.assign(element.padding, markUpElement.padding ?? {});
        element.bgColor = markUpElement.bgColor;
        element.borderColor = markUpElement.borderColor;
        element.borderWidth = markUpElement.borderWidth;
        element.z = markUpElement.z ?? 0;
        element.visibility = markUpElement.visibility ?? 2;

        if (children) {
            if (markUpElement.column) {
                element.direction = 'v';
            } else if (markUpElement.row) {
                element.direction = 'h';
            }
            for (let i = 0; i < children.length; i++) {
                const childElement = this.compile(children[i]);
                element.children.push(childElement);
            }
            element.calculateLengthAndBreadth();
        } else {
            // leaf
            element.translation = [0, 0];
            element.scale = [1, 1]; 
            element.reverse = [1, 1];
        }
        return element;
    }

    static decompile(element) {
        return this.decompileAux(element, 'v');
    }

    static decompileAux(element, parentDir) {
        function cleanPadding(mm) {
            const m = {};
            if (mm.top !== 0) { m.top = mm.top; }
            if (mm.bottom !== 0) { m.bottom = mm.bottom; }
            if (mm.left !== 0) { m.left = mm.left; }
            if (mm.right !== 0) { m.right = mm.right; }
            if (Object.keys(m).length === 0) { return null; }
            return m;
        }

        const markUpElement = {};
        if (element.bgColor) { markUpElement.bgColor = element.bgColor; }
        if (element.borderColor) { markUpElement.borderColor = element.borderColor; }
        if (element.borderWidth) { markUpElement.borderWidth = element.borderWidth; }
        if (element.z && element.z !== 0) { markUpElement.z = element.z; }
        if (element.visibility && element.visibility !== 2) { markUpElement.visibility = element.visibility; }
        if (element.direction) {
            const dir = element.direction == 'h' ? 'row' : 'column';
            markUpElement[dir] = [];
            for (let i = 0; i < element.children.length; i++) {
                markUpElement[dir].push(this.decompileAux(element.children[i], element.direction));
            }
            if (element.divider.spacing !== 0 || element.divider.slant !== 0) {
                markUpElement.divider = {};
                if (element.divider.spacing !== 0) {
                    markUpElement.divider.spacing = element.spacing;
                }
                if (element.divider.slant !== 0) {
                    markUpElement.divider.slant = element.slant;
                }
            }
            const padding = cleanPadding(element.padding);
            if (padding) {
                markUpElement.padding = padding;
            }
        }
        if (parentDir == 'h') {
            markUpElement.width = element.rawSize;
        } else {
            markUpElement.height = element.rawSize;
        }

        return markUpElement;
    }

    static findParent(element, target) {
        for (let i = 0; i < element.children.length; i++) {
            const child = element.children[i];
            if (child == target) {
                return element;
            } else {
                const parent = this.findParent(child, target);
                if (parent) {
                    return parent;
                }
            }
        }
        return null;
    }

    static eraseElement(root, target) {
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

    static duplicateElement(root, target) {
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

    static splitElementHorizontal(root, target) {
        this.splitElement(root, target, 'h');
    }

    static splitElementVertical(root, target) {
        this.splitElement(root, target, 'v');
    }

    static splitElement(root, target, splitDirection) {
        const parent = this.findParent(root, target);
        if (parent) {
            const dir = parent.direction;
            console.log(dir, splitDirection);
            if (dir === splitDirection) { 
                console.log("same direction");
                const index = parent.children.indexOf(target);
                const spacing = target.divider.spacing;
                const length = target.rawSize;
                const newElement = new FrameElement((length - spacing) / 2);
                newElement.calculateLengthAndBreadth();
                target.rawSize = newElement.rawSize;
                parent.children.splice(index+1, 0, newElement);
                parent.calculateLengthAndBreadth();
            } else {
                console.log("different direction");
                const index = parent.children.indexOf(target);
                const newElement = new FrameElement(target.rawSize);
                newElement.direction = splitDirection;
                for (let i = 0; i < 2; i++) {
                    const newChild = new FrameElement(target.rawSize);
                    newChild.calculateLengthAndBreadth();
                    newElement.children.push(newChild);
                }
                if (target.image) {
                    newElement.children[0].image = target.image;
                    newElement.children[0].translation = target.translation;
                    newElement.children[0].scale = target.scale;
                }
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

    calculateLengthAndBreadth() {
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

    getLogicalSize() {
        if (this.direction === 'h') {
            return [this.localLength, this.localBreadth];
        } else if (this.direction === 'v') {
            return [this.localBreadth, this.localLength];
        } else {
            return [this.rawSize, this.rawSize];
        }
    }

    static visibilityCandidates = ["none", "background", "full"];
}

export function calculatePhysicalLayout(element, size, origin){
    const corners = {
        topLeft: [origin[0], origin[1]],
        topRight: [origin[0] + size[0], origin[1]],
        bottomLeft: [origin[0], origin[1] + size[1]],
        bottomRight: [origin[0] + size[0], origin[1] + size[1]]
    };
    return calculatePhysicalLayoutAux(element, size, origin, corners);
}

function calculatePhysicalLayoutAux(element, size, origin, corners) {
    if (!element.direction) {
        return calculatePhysicalLayoutLeaf(element, size, origin, corners);
    } else {
        return calculatePhysicalLayoutElements(element, size, origin, corners);
    }
}    

function line(p1, p2) {
    // p1, p2 => y = ax + b, return [a, b]
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const a = dy / dx;
    const b = p1[1] - a * p1[0];
    return [a, b];
}

function line2(p1, theta) {
    // p1, slant(theta) => y = ax + b, return [a, b]
    const rad = Math.PI / 180;
    const a = Math.tan(theta*rad);
    const b = p1[1] - a * p1[0];
    return [a, b];
}

function intersection(line1, line2) {
    const a1 = line1[0];
    const b1 = line1[1];
    const a2 = line2[0];
    const b2 = line2[1];
    const x = (b2 - b1) / (a1 - a2);
    const y = a1 * x + b1;
    return [x, y];
}

function paddedRect(rawOrigin, rawSize, padding) {
    const origin = [rawOrigin[0] + padding.left * rawSize[0], rawOrigin[1] + padding.top * rawSize[1]];
    const size = [rawSize[0] * (1 - padding.left - padding.right), rawSize[1] * (1 - padding.top - padding.bottom)];
    return [origin, size];
}

function calculatePhysicalLayoutElements(element, rawSize, rawOrigin, corners) {
    const [origin, size] = paddedRect(rawOrigin, rawSize, element.padding);

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
        const leftmostLine = line(corners['topLeft'], corners['bottomLeft']);
        const rightmostLine = line(corners['topRight'], corners['bottomRight']);
        const topLine = line(corners['topLeft'], corners['topRight']);
        const bottomLine = line(corners['bottomLeft'], corners['bottomRight']);
        for (let i = 0; i < element.children.length; i++) {
            const child = element.children[i];
            const childSize = [child.rawSize * xf, inner_height];
            const childOrigin = [origin[0] + size[0] - x * xf - childSize[0], origin[1] + y * yf];

            const rightCenter = [childOrigin[0] + childSize[0], childOrigin[1] + childSize[1] / 2];
            const leftCenter = [childOrigin[0], childOrigin[1] + childSize[1] / 2];
            const rightLine = i === 0 ? rightmostLine : line2(rightCenter, element.children[i-1].divider.slant + 90);
            const leftLine = i === element.children.length - 1 ? leftmostLine : line2(leftCenter, child.divider.slant + 90);

            const childCorners = {
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
        const topmostLine = line(corners['topLeft'], corners['topRight']);
        const bottommostLine = line(corners['bottomLeft'], corners['bottomRight']);
        const leftLine = line(corners['topLeft'], corners['bottomLeft']);
        const rightLine = line(corners['topRight'], corners['bottomRight']);
        for (let i = 0; i < element.children.length; i++) {
            const child = element.children[i];
            const childSize = [inner_width, child.rawSize * yf];
            const childOrigin = [origin[0] + x * xf, origin[1] + y * yf];
            const topCenter = [childOrigin[0] + childSize[0] / 2, childOrigin[1]];
            const bottomCenter = [childOrigin[0] + childSize[0] / 2, childOrigin[1] + childSize[1]];
            const topLine = i === 0 ? topmostLine : line2(topCenter, -element.children[i-1].divider.slant);
            const bottomLine = i === element.children.length - 1 ? bottommostLine : line2(bottomCenter, -child.divider.slant);

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

function calculatePhysicalLayoutLeaf(element, rawSize, rawOrigin, corners) {
    const [origin, size] = paddedRect(rawOrigin, rawSize, element.padding);
    return { size, origin, rawSize, rawOrigin, element, corners };
}

function isPointInRect(rect, point) {
    const [x, y] = point;
    const [x0, y0, x1, y1] = rect;
    return x0 <= x && x < x1 && y0 <= y && y < y1;
}

export function rectFromPositionAndSize(position, size) {
    const [x, y] = position;
    const [w, h] = size;
    return [x, y, x + w, y + h];
}

export function findLayoutAt(layout, position) {
    if (layout.children) {
        for (let i = 0; i < layout.children.length; i++) {
            const child = layout.children[i];
            const found = findLayoutAt(child, position);
            if (found) { return found; }
        }
    }
    if (isPointInTrapezoid(position, layout.corners)) {
        return layout;
    }
    return null;
}

export function findLayoutOf(layout, element) {
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

export function findBorderAt(layout, position) {
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

export function findPaddingAt(layout, position) {
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

function findPaddingOn(layout, position) {
    if (layout.element.visibility === 0) { return null; }
    const [x,y] = position;
    for (let handle of ["top", "bottom", "left", "right"]) {
        const paddingTrapezoid = makePaddingTrapezoid(layout, handle);
        if (isPointInTrapezoid([x, y], paddingTrapezoid)) {
            return { layout, handle, trapezoid: paddingTrapezoid };
        }
    }
    return null;
}

export function makePaddingTrapezoid(layout, handle) {
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

function trapezoidAroundSegment(p0, p1, width) {
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

export function makeBorderRect(layout, index) {
    if (layout.dir == 'h') {
        return makeHorizontalBorderRect(layout, index);
    } else {
        return makeVerticalBorderRect(layout, index);
    }
}

function makeHorizontalBorderRect(layout, index) {
    const prev = layout.children[index - 1];
    const curr = layout.children[index];
    const cox0 = curr.origin[0] + curr.size[1];
    const coy0 = curr.origin[1];
    const cox1 = prev.origin[0];
    const coy1 = curr.origin[1] + curr.size[1];
    return [cox0 - BORDER_WIDTH, coy0, cox1 + BORDER_WIDTH, coy1];
}

function makeVerticalBorderRect(layout, index) {
    const prev = layout.children[index - 1];
    const curr = layout.children[index];
    const cox0 = curr.origin[0];
    const coy0 = prev.origin[1] + prev.size[1];
    const cox1 = curr.origin[0] + curr.size[0];
    const coy1 = curr.origin[1];
    return [cox0, coy0 - BORDER_WIDTH, cox1, coy1 + BORDER_WIDTH];
}

export function makeBorderTrapezoid(layout, index) {
    if (layout.dir == 'h') {
        return makeHorizontalBorderTrapezoid(layout, index);
    } else {
        return makeVerticalBorderTrapezoid(layout, index);
    }
}

function makeHorizontalBorderTrapezoid(layout, index) {
    const prev = layout.children[index - 1];
    const curr = layout.children[index];
    const cox0 = curr.origin[0] + curr.size[0];
    const coy0 = curr.origin[1];
    const cox1 = prev.origin[0];
    const coy1 = curr.origin[1] + curr.size[1];

    const corners = {
        topLeft: [cox0 - BORDER_WIDTH, coy0],
        topRight: [cox1 + BORDER_WIDTH, coy0],
        bottomLeft: [cox0 - BORDER_WIDTH, coy1],
        bottomRight: [cox1 + BORDER_WIDTH, coy1],
    }

    const h = layout.size[1];
    const rad = Math.PI / 180;
    const slant = prev.element.divider.slant;
    if (slant != 0) {
        const dx = Math.cos(Math.PI*0.5 + slant * rad) * (h * 0.5);
        corners.topLeft[0] -= dx;
        corners.topRight[0] -= dx;
        corners.bottomLeft[0] += dx;
        corners.bottomRight[0] += dx;
    }

    return corners;
}

function makeVerticalBorderTrapezoid(layout, index) {
    const prev = layout.children[index - 1];
    const curr = layout.children[index];
    const cox0 = curr.origin[0];
    const coy0 = prev.origin[1] + prev.size[1];
    const cox1 = curr.origin[0] + curr.size[0];
    const coy1 = curr.origin[1];

    const corners = {
        topLeft: [cox0, coy0 - BORDER_WIDTH],
        topRight: [cox1, coy0 - BORDER_WIDTH],
        bottomLeft: [cox0, coy1 + BORDER_WIDTH],
        bottomRight: [cox1, coy1 + BORDER_WIDTH],
    }

    const w = layout.size[0];
    const rad = Math.PI / 180;
    const slant = prev.element.divider.slant;
    if (slant != 0) {
        const dy = Math.sin(slant * rad) * (w * 0.5);
        corners.topRight[1] -= dy;
        corners.bottomRight[1] -= dy;
        corners.topLeft[1] += dy;
        corners.bottomLeft[1] += dy;
    }

    return corners;
}

function isPointInTriangle(p, t) {
    const [x, y] = p;
    const [x0, y0] = t[0];
    const [x1, y1] = t[1]
    const [x2, y2] = t[2]

    const d1 = (x - x0) * (y1 - y0) - (x1 - x0) * (y - y0);
    const d2 = (x - x1) * (y2 - y1) - (x2 - x1) * (y - y1);
    const d3 = (x - x2) * (y0 - y2) - (x0 - x2) * (y - y2);

    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

function isPointInTrapezoid(p, t) {
    return isPointInTriangle(p, [t.topLeft, t.topRight, t.bottomRight]) ||
        isPointInTriangle(p, [t.topLeft, t.bottomRight, t.bottomLeft]);
}

export function collectImages(frameTree) {
  const images = [];
  if (!frameTree.children || frameTree.children.length === 0) {
    images.push({
      image: frameTree.image,
      scale: frameTree.scale,
      translation: frameTree.translation,
    });
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      const childImages = collectImages(frameTree.children[i]);
      images.push(...childImages);
    }
  }
  return images;
}

export function dealImages(frameTree, images) {
  if (!frameTree.children || frameTree.children.length === 0) {
    if (images.length === 0) {
      return;
    }
    const { image, scale, translation } = images.shift();
    frameTree.image = image;
    frameTree.scale = scale;
    frameTree.translation = translation;
  } else {
    for (let i = 0; i < frameTree.children.length; i++) {
      dealImages(frameTree.children[i], images);
    }
  }

}

