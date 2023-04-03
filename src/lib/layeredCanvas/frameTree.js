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
        this.margin = { top: 0, bottom: 0, left: 0, right: 0 };
        this.translation = [0, 0];
        this.scale = [1, 1]; 
        this.reverse = [1, 1];
        this.bgColor = null;
        this.borderColor = null;
        this.borderWidth = 1;

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
        element.margin = { ...this.margin };
        element.translation = [...this.translation];
        element.scale = [...this.scale];
        element.reverse = [...this.reverse];
        element.bgColor = this.bgColor;
        element.borderColor = this.borderColor;
        element.borderWidth = this.borderWidth;
        element.image = this.image;
        return element;
    }

    static compile(markUpElement) {
        const element = new FrameElement(markUpElement.width || markUpElement.height || markUpElement.size || 1);
        const children = markUpElement.column || markUpElement.row;
        element.divider = { 
            spacing: markUpElement?.divider?.spacing || 0, 
            slant: markUpElement?.divider?.slant || 0 
        };
        element.margin = {top:0, bottom:0, left:0, right:0};
        element.bgColor = markUpElement.bgColor;
        element.borderColor = markUpElement.borderColor;
        element.borderWidth = markUpElement.borderWidth ?? 1;
        Object.assign(element.margin, markUpElement.margin || {});

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
        function cleanMargin(mm) {
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
        if (element.borderWidth !== 1) { markUpElement.borderWidth = element.borderWidth; }
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
            const margin = cleanMargin(element.margin);
            if (margin) {
                markUpElement.margin = margin;
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
                const spacing = parent.divider.spacing;
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
                newElement.margin = JSON.parse(JSON.stringify(target.margin));
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
        if (this.direction == 'v') {
            totalLength = this.margin.top + this.margin.bottom;
            this.localBreadth = this.margin.left + this.rawSize + this.margin.right;
        } else if (this.direction == 'h') {
            totalLength = this.margin.left + this.margin.right;
            this.localBreadth = this.margin.top + this.rawSize + this.margin.bottom;
        }
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if (0 < i) { totalLength += this.divider.spacing; }
            totalLength += child.rawSize;
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
}

export function calculatePhysicalLayout(element, size, origin, context={leftSlant: 0,rightSlant: 0,topSlant: 0,bottomSlant: 0}){
    if (!element.direction) {
        return calculatePhysicalLayoutLeaf(element, size, origin, context);
    } else {
        return calculatePhysicalLayoutElements(element, size, origin, context);
    }
}

function calculatePhysicalLayoutElements(element, size, origin, context) {
    const margin = element.margin;
    const dir = element.direction;
    const psize = element.localLength;
    const ssize = element.localBreadth;
    const xf = dir == 'h' ? size[0] / psize : size[0] / ssize;
    const yf = dir == 'v' ? size[1] / psize : size[1] / ssize;
    const inner_width = (ssize - margin.left - margin.right) * xf;
    const inner_height = (ssize - margin.top - margin.bottom) * yf;
    let x = margin.left;
    let y = margin.top;
    const children = [];
    // console.log(margin, inner_width, inner_height, xf, yf, psize, ssize);
    if (dir == 'h') {
        for (let i = element.children.length - 1 ; 0 <= i ; i--) {
            const child = element.children[i];
            const childOrigin = [origin[0] + x * xf, origin[1] + y * yf];
            const childSize = [child.rawSize * xf, inner_height];
            context = {
                leftSlant: i == element.children.length - 1 ? 0 : element.divider.slant,
                rightSlant: i == 0 ? 0 : element.divider.slant,
                topSlant: 0,
                bottomSlant: 0,
            }
            children.push(calculatePhysicalLayout(child, childSize, childOrigin, context));
            x += child.rawSize + element.divider.spacing;
        }
    } else {
        for (let i = 0; i < element.children.length; i++) {
            const child = element.children[i];
            const childOrigin = [origin[0] + x * xf, origin[1] + y * yf];
            const childSize = [inner_width, child.rawSize * yf];
            context = {
                topSlant: i == 0 ? 0 : element.divider.slant,
                bottomSlant: i == element.children.length - 1 ? 0 : element.divider.slant,
                leftSlant: 0,
                rightSlant: 0,
            }
            children.push(calculatePhysicalLayout(child, childSize, childOrigin, context));
            y += child.rawSize + element.divider.spacing;
        }
    }
    const physicalMargin = {
        top: margin.top * yf,
        bottom: margin.bottom * yf,
        left: margin.left * xf,
        right: margin.right * xf,
    };
    const corners = {
        topLeft: [origin[0] + physicalMargin.left, origin[1] + physicalMargin.top],
        topRight: [origin[0] + size[0] - physicalMargin.right, origin[1] + physicalMargin.top],
        bottomLeft: [origin[0] + physicalMargin.left, origin[1] + size[1] - physicalMargin.bottom],
        bottomRight: [origin[0] + size[0] - physicalMargin.right, origin[1] + size[1] - physicalMargin.bottom],
    }    
    return { size, origin, children, element, dir, corners, physicalMargin };
}

function calculatePhysicalLayoutLeaf(element, size, origin, ctx) {
    const logicalWidth = element.margin.left + element.rawSize + element.margin.right;
    const logicalHeight = element.margin.top + element.rawSize + element.margin.bottom;
    const xf = size[0] / logicalWidth;
    const yf = size[1] / logicalHeight;

    const physicalMargin = {
        top: element.margin.top * yf,
        bottom: element.margin.bottom * yf,
        left: element.margin.left * xf,
        right: element.margin.right * xf,
    }

    const corners = {
        topLeft: [origin[0] + physicalMargin.left, origin[1] + physicalMargin.top],
        topRight: [origin[0] + size[0] - physicalMargin.right, origin[1] + physicalMargin.top],
        bottomLeft: [origin[0] + physicalMargin.left, origin[1] + size[1] - physicalMargin.bottom],
        bottomRight: [origin[0] + size[0] - physicalMargin.right, origin[1] + size[1] - physicalMargin.bottom],
    }    

    const [w, h] = [size[0] - physicalMargin.left - physicalMargin.right, size[1] - physicalMargin.top - physicalMargin.bottom];

    const rad = Math.PI / 180;
    if (ctx.leftSlant != 0) {
        const dx = Math.cos(Math.PI*0.5 + ctx.leftSlant * rad) * (h * 0.5);
        corners.topLeft[0] -= dx;
        corners.bottomLeft[0] += dx;
    }
    if (ctx.rightSlant != 0) {
        const dx = Math.cos(Math.PI*0.5 + ctx.rightSlant * rad) * (h * 0.5);
        corners.topRight[0] -= dx;
        corners.bottomRight[0] += dx;
    }
    if (ctx.topSlant != 0) {
        const dy = Math.sin(ctx.topSlant * rad) * (w * 0.5);
        corners.topLeft[1] += dy;
        corners.topRight[1] -= dy;
    }
    if (ctx.bottomSlant != 0) {
        const dy = Math.sin(ctx.bottomSlant * rad) * (w * 0.5);
        corners.bottomLeft[1] += dy;
        corners.bottomRight[1] -= dy;
    }

    return { size, origin, element, corners, physicalMargin };
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
    const r = rectFromPositionAndSize(layout.origin, layout.size);
    if (!isPointInRect(r, position)) {
        return null;
    }
    if (layout.children) {
        for (let i = 0; i < layout.children.length; i++) {
            const child = layout.children[i];
            const found = findLayoutAt(child, position);
            if (found) { return found; }
        }
        return null;
    }
    return layout;
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

    const r = rectFromPositionAndSize(layout.origin, layout.size);
    if (!isPointInRect(r, position)) {
        return null;
    }
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

export function findMarginAt(layout, position) {
    const [x,y] = position;

    const r = rectFromPositionAndSize(layout.origin, layout.size);
    if (!isPointInRect(r, position)) {
        return null;
    }
    if (layout.children) {
        for (let i = 0; i < layout.children.length; i++) {
            const found = findMarginAt(layout.children[i], position);
            if (found) { return found; }
        }

        for (let handle of ["top", "bottom", "left", "right"]) {
            const marginRect = makeMarginRect(layout, handle);
            if (isPointInRect(marginRect, [x, y])) {
                return { layout, handle };
            }
        }
    } else {
        for (let handle of ["top", "bottom", "left", "right"]) {
            const marginRect = makeMarginRect(layout, handle);
            if (isPointInRect(marginRect, [x, y])) {
                return { layout, handle };
            }
        }
    }
    return null;
}

export function makeMarginRect(layout, handle) {
    const [x, y] = layout.origin;
    const [w, h] = layout.size;
    const margin = layout.physicalMargin;
    const MIN_MARGIN = 10;
    switch (handle) {
        case 'top':
            return [x, y, x + w, y + Math.max(margin.top, MIN_MARGIN)];
        case 'bottom':
            return [x, y + h - Math.max(margin.bottom, MIN_MARGIN), x + w, y + h];
        case 'left':
            return [x, y, x + Math.max(margin.left, MIN_MARGIN), y + h];
        case 'right':
            return [x + w - Math.max(margin.right, MIN_MARGIN), y, x + w, y + h];
    }
    return null;
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
    const cox0 = prev.origin[0] + prev.size[0];
    const coy0 = curr.origin[1];
    const cox1 = curr.origin[0];
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
    const margin = layout.physicalMargin;
    const cox0 = prev.origin[0] + prev.size[0];
    const coy0 = curr.origin[1] + margin.top;
    const cox1 = curr.origin[0];
    const coy1 = curr.origin[1] + curr.size[1] - margin.bottom;

    const corners = {
        topLeft: [cox0 - BORDER_WIDTH, coy0],
        topRight: [cox1 + BORDER_WIDTH, coy0],
        bottomLeft: [cox0 - BORDER_WIDTH, coy1],
        bottomRight: [cox1 + BORDER_WIDTH, coy1],
    }

    const h = layout.size[1] - margin.top - margin.bottom;
    const rad = Math.PI / 180;
    const slant = layout.element.divider.slant;
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
    const margin = layout.physicalMargin;
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

    const w = layout.size[0] - margin.left - margin.right;
    const rad = Math.PI / 180;
    const slant = layout.element.divider.slant;
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

