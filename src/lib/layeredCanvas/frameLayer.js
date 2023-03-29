import { Layer } from "./layeredCanvas.js";
import { FrameElement, calculatePhysicalLayout, findLayoutAt, findLayoutOf, findBorderAt, findMarginAt, makeBorderTrapezoid, makeMarginRect, rectFromPositionAndSize } from "./frameTree.js";
import { translate, scale } from "./pictureControl.js";
import { keyDownFlags } from "./keyCache.js";
import { ClickableIcon } from "./clickableIcon.js";

export class FrameLayer extends Layer {
  constructor(frameTree, interactable, onCommit) {
    super();
    this.frameTree = frameTree;
    this.interactable = interactable;
    this.onCommit = onCommit;
    this.splitHorizontalIcon = new ClickableIcon("split-horizontal.png",[0, 0],[32, 32]);
    this.splitVerticalIcon = new ClickableIcon("split-vertical.png",[0, 0],[32, 32]);
    this.expandHorizontalIcon = new ClickableIcon("expand-horizontal.png",[0, 0],[32, 32]);
    this.expandVerticalIcon = new ClickableIcon("expand-vertical.png",[0, 0],[32, 32]);
    this.deleteIcon = new ClickableIcon("delete.png", [0, 0], [32, 32]);
    this.scaleIcon = new ClickableIcon("scale.png", [0, 0], [32, 32]);
    this.dropIcon = new ClickableIcon("drop.png", [0, 0], [32, 32]);
    this.flipHorizontalIcon = new ClickableIcon("flip-horizontal.png", [0, 0], [32, 32]);
    this.flipVerticalIcon = new ClickableIcon("flip-vertical.png", [0, 0], [32, 32]);
    this.slantHorizontalIcon = new ClickableIcon("slant-horizontal.png", [0, 0], [32, 32]);
    this.slantVerticalIcon = new ClickableIcon("slant-vertical.png", [0, 0], [32, 32]);
    this.transparentPattern = new Image();
    this.transparentPattern.src = new URL(
      "../../assets/transparent.png",
      import.meta.url
    ).href;
  }

  render(ctx) {
    const size = this.getCanvasSize();

    // fill background
    ctx.fillStyle = "rgb(255,255,255, 1)";
    ctx.fillRect(0, 0, size[0], size[1]);

    const layout = calculatePhysicalLayout(this.frameTree, size, [0, 0]);
    const inheritanceContext = { bgColor: "transparent"};
    this.renderElement(ctx, layout, inheritanceContext);
    if (!this.interactable) {
      return;
    }

    if (this.focusedMargin) {
      const newLayout = findLayoutOf(layout, this.focusedMargin.layout.element);
      const marginRect = makeMarginRect(newLayout, this.focusedMargin.handle);

      ctx.fillStyle = "rgba(0,0,200,0.7)";
      ctx.fillRect(
        marginRect[0],
        marginRect[1],
        marginRect[2] - marginRect[0],
        marginRect[3] - marginRect[1]
      );
    }

    if (this.focusedBorder) {
      const newLayout = findLayoutOf(layout, this.focusedBorder.layout.element);
      const bt = makeBorderTrapezoid(newLayout, this.focusedBorder.index);

      ctx.fillStyle = "rgba(0,200,200,0.7)";
      ctx.beginPath();
      this.trapezoidPath(ctx, bt);
      ctx.fill();
      
      if (this.focusedBorder.layout.dir === "v") {
        this.slantVerticalIcon.position = [bt.topLeft[0],(bt.topLeft[1] + bt.bottomLeft[1]) * 0.5 - 16];
        this.slantVerticalIcon.render(ctx);
        this.expandVerticalIcon.position = [bt.topRight[0] - 32,(bt.topRight[1] + bt.bottomRight[1]) * 0.5 - 16];
        this.expandVerticalIcon.render(ctx);
      } else {
        this.slantHorizontalIcon.position = [(bt.topLeft[0] + bt.topRight[0]) * 0.5 - 16,bt.topLeft[1]];
        this.slantHorizontalIcon.render(ctx);
        this.expandHorizontalIcon.position = [(bt.bottomLeft[0] + bt.bottomRight[0]) * 0.5 - 16,bt.bottomLeft[1] - 32];
        this.expandHorizontalIcon.render(ctx);
      }
    }

    if (this.focusedLayout && !this.pointerHandler) {
      this.splitHorizontalIcon.render(ctx);
      this.splitVerticalIcon.render(ctx);
      this.deleteIcon.render(ctx);
      if (this.focusedLayout.element.image) {
        this.scaleIcon.render(ctx);
        this.dropIcon.render(ctx);
        this.flipHorizontalIcon.render(ctx);
        this.flipVerticalIcon.render(ctx);
      }
    }
  }

  renderElement(ctx, layout, inheritanceContext) {
    if (layout.element.bgColor) { 
      inheritanceContext.bgColor = layout.element.bgColor;
    }

    if (layout.children) {
      this.renderBackground(ctx, layout, inheritanceContext);
      for (let i = 0; i < layout.children.length; i++) {
        this.renderElement(ctx, layout.children[i], inheritanceContext);
      }
    } else {
      this.renderElementLeaf(ctx, layout, inheritanceContext);
    }
  }

  renderElementLeaf(ctx, layout, inheritanceContext) {
    this.renderBackground(ctx, layout, inheritanceContext);

    const element = layout.element;
    if (element.image) {
      // clip
      ctx.save();
      ctx.clip();

      const [x0, y0, x1, y1] = [
        Math.min(layout.corners.topLeft[0], layout.corners.bottomLeft[0]),
        Math.min(layout.corners.topLeft[1], layout.corners.topRight[1]),
        Math.max(layout.corners.topRight[0], layout.corners.bottomRight[0]),
        Math.max(layout.corners.bottomLeft[1], layout.corners.bottomRight[1]),
      ]

      ctx.translate((x0 + x1) * 0.5 + element.translation[0], (y0 + y1) * 0.5 + element.translation[1]);
      ctx.scale(element.scale[0] * element.reverse[0], element.scale[1] * element.reverse[1]);
      ctx.translate(-element.image.width * 0.5, -element.image.height * 0.5);
      ctx.drawImage(element.image, 0, 0);

      // unclip
      ctx.restore();
    }

    if (layout.element.bgColor !== "transparent") {
      ctx.strokeStyle = "rgb(0,0,0)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  renderBackground(ctx, layout, inheritanceContext) {
    const origin = layout.origin;
    const size = layout.size;

    let bgColor = inheritanceContext.bgColor;
    if (bgColor == "transparent") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgb(255,255,255, 1)";
      this.trapezoidPath(ctx, layout.corners);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      // random color
      // ctx.fillStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
      ctx.beginPath();
      this.trapezoidPath(ctx, layout.corners);
      ctx.fill();
    }
  }

  trapezoidPath(ctx, corners) {
    ctx.moveTo(...corners.topLeft);
    ctx.lineTo(...corners.topRight);
    ctx.lineTo(...corners.bottomRight);
    ctx.lineTo(...corners.bottomLeft);
    ctx.lineTo(...corners.topLeft);
  }

  dropped(image, position) {
    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
      [0, 0]
    );
    let layoutlet = findLayoutAt(layout, position);
    if (layoutlet) {
      this.importImage(layoutlet, image);
      return true;
    }
    return false;
  }

  pointerHover(point) {
    if (keyDownFlags["Space"]) { return; }

    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
      [0, 0]
    );

    this.focusedMargin = null;
    this.focusedBorder = null;
    this.focusedLayout = null;

    if (keyDownFlags["KeyR"]) {
      this.focusedMargin = findMarginAt(layout, point);
      if (this.focusedMargin) {
        this.redraw();
        this.hint(point, null);
        return;
      }
    }

    const border = findBorderAt(layout, point);
    if (border) {
      this.focusedBorder = border;
      this.redraw();
      this.hint(point, null);
      return;
    } 

    this.focusedLayout = findLayoutAt(layout, point);
    if (this.focusedLayout) {
      const origin = this.focusedLayout.origin;
      const size = this.focusedLayout.size;
      const [x, y] = [origin[0] + size[0] / 2, origin[1] + size[1] / 2];
      this.splitHorizontalIcon.position = [x + 32, y];
      this.splitVerticalIcon.position = [x, y + 32];
      this.deleteIcon.position = [origin[0] + size[0] - 32, origin[1]];
      this.scaleIcon.position = [origin[0] + size[0] - 32, origin[1] + size[1] - 32];
      this.dropIcon.position = [origin[0], origin[1] + size[1] - 32];
      this.flipHorizontalIcon.position = [origin[0] + 48, origin[1] + size[1] - 32];
      this.flipVerticalIcon.position = [origin[0] + 72, origin[1] + size[1] - 32,];
      if (this.interactable) {
        // TODO: 整理する
        if (this.splitHorizontalIcon.contains(point)) {
          this.hint(this.splitHorizontalIcon.hintPosition, "横に分割");
        } else if (this.splitVerticalIcon.contains(point)) {
          this.hint(this.splitVerticalIcon.hintPosition, "縦に分割");
        } else if (this.deleteIcon.contains(point)) {
          this.hint(this.deleteIcon.hintPosition, "削除");
        } else if (this.scaleIcon.contains(point)) {
          if (this.focusedLayout.element.image) {
            this.hint(this.scaleIcon.hintPosition, "ドラッグでスケール");
          }
        } else if (this.dropIcon.contains(point)) {
          if (this.focusedLayout.element.image) {
            this.hint(this.dropIcon, "画像除去");
          }
        } else if (this.flipHorizontalIcon.contains(point)) {
          if (this.focusedLayout.element.image) {
            this.hint(this.flipHorizontalIcon.hintPosition, "左右反転");
          }
        } else if (this.flipVerticalIcon.contains(point)) {
          if (this.focusedLayout.element.image) {
            this.hint(this.flipVerticalIcon.hintPosition, "上下反転");
          }
        } else if (this.focusedLayout.element.image) {
          this.hint(
            [x, origin[1] + 16],
            "ドラッグで移動、Ctrl+ドラッグでスケール"
          );
        } else {
          this.hint([x, origin[1] + 16], "画像をドロップ");
        }
      }
      this.hint(point, null);
      this.redraw();
    }
  }

  accepts(point) {
    if (!this.interactable) {
      return null;
    }

    if (keyDownFlags["Space"]) {
      return null;
    }

    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
      [0, 0]
    );

    if (keyDownFlags["KeyR"]) {
      const margin = findMarginAt(layout, point);
      if (margin) {
        return { margin };
      }
    }

    const border = findBorderAt(layout, point);
    if (border) {
      return { border };
    }

    const layoutElement = findLayoutAt(layout, point);
    if (layoutElement) {
      if (keyDownFlags["KeyQ"]) {
        FrameElement.eraseElement(this.frameTree, layoutElement.element);
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyW"]) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyS"]) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyD"]) {
        layoutElement.element.image = null;
        this.redraw();
      }
      if (keyDownFlags["KeyT"]) {
        layoutElement.element.reverse[0] *= -1;
        this.redraw();
      }
      if (keyDownFlags["KeyY"]) {
        layoutElement.element.reverse[1] *= -1;
        this.redraw();
      }
      if (this.splitHorizontalIcon.contains(point)) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.splitVerticalIcon.contains(point)) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layoutElement.element
        );
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.deleteIcon.contains(point)) {
        FrameElement.eraseElement(this.frameTree, layoutElement.element);
        this.constraintAll();
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (layoutElement.element.image) {
        if (this.dropIcon.contains(point)) {
          layoutElement.element.image = null;
          this.redraw();
        } else if (this.flipHorizontalIcon.contains(point)) {
          layoutElement.element.reverse[0] *= -1;
          this.redraw();
        } else if (this.flipVerticalIcon.contains(point)) {
          layoutElement.element.reverse[1] *= -1;
          this.redraw();
        } else {
          return { layout: layoutElement };
        }
      }
    }

    return null;
  }

  async *pointer(p, payload) {
    if (payload.layout) {
      const layout = payload.layout;
      const element = layout.element;
      if (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"] || 
          this.scaleIcon.contains(p)) {
        const origin = element.scale[0];
        const size = layout.size;
        yield* scale(this.canvas, p, (q) => {
          const s = Math.max(q[0], q[1]);
          element.scale = [origin * s, origin * s];
          this.constraintLeaf(layout);
          this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
        });
      } else {
        const origin = element.translation;
        yield* translate(p, (q) => {
          element.translation = [origin[0] + q[0], origin[1] + q[1]];
          this.constraintLeaf(layout);
          this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
        });
      }
    } else if (payload.margin) {
        yield* this.expandMargin(p, payload.margin);
    } else {
      if (
        keyDownFlags["ControlLeft"] ||
        keyDownFlags["ControlRight"] ||
        this.expandHorizontalIcon.contains(p) ||
        this.expandVerticalIcon.contains(p)
      ) {
        yield* this.expandBorder(p, payload.border);
      } else if (
        keyDownFlags["ShiftLeft"] ||
        keyDownFlags["ShiftRight"] ||
        this.slantHorizontalIcon.contains(p) ||
        this.slantVerticalIcon.contains(p)
      ) {
        yield* this.slantBorder(p, payload.border);
      } else {
        yield* this.moveBorder(p, payload.border);
      }
    }
  }

  *moveBorder(p, border) {
    const layout = border.layout;
    const index = border.index;

    const child0 = layout.children[index - 1];
    const child1 = layout.children[index];

    const c0 = child0.element;
    const c1 = child1.element;
    const rawSpacing = layout.element.divider.spacing;
    const rawSum = c0.rawSize + rawSpacing + c1.rawSize;

    while ((p = yield)) {
      const balance = this.getBorderBalance(p, border);
      const t = balance * rawSum;
      c0.rawSize = t - rawSpacing * 0.5;
      c1.rawSize = rawSum - t - rawSpacing * 0.5;
      this.constraintTree(border.layout);
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *expandBorder(p, border) {
    const element = border.layout.element;
    const rawSpacing = element.divider.spacing;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const factor = border.layout.size[dir] / this.getCanvasSize()[dir];
    const s = p;

    while ((p = yield)) {
      const op = p[dir] - s[dir];
      element.divider.spacing = Math.max(0, rawSpacing + op * factor * 0.1);
      element.calculateLengthAndBreadth();
      this.constraintTree(border.layout);
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *slantBorder(p, border) {
    const element = border.layout.element;
    const rawSlant = element.divider.slant;
    const dir = border.layout.dir == "h" ? 0 : 1;

    const s = p;
    while ((p = yield)) {
      const op = p[dir] - s[dir];
      element.divider.slant = Math.max(-45, Math.min(45, rawSlant + op * 0.2));
      this.constraintTree(border.layout); // 前後だけ
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *expandMargin(p, margin) {
    const element = margin.layout.element;
    const dir = margin.handle === "top" || margin.handle === "bottom" ? 1 : 0;
    const physicalSize = margin.layout.size[dir];
    const logicalSize = element.getLogicalSize()[dir];
    const factor = logicalSize / physicalSize;
    const s = p;

    const oldLogicalMargin = element.margin[margin.handle];

    while ((p = yield)) {
      let physicalMarginDelta = p[dir] - s[dir];
      if (margin.handle === "bottom" || margin.handle === "right") { physicalMarginDelta = -physicalMarginDelta; }
      // 比率なのでだんだん乖離していくが、一旦そのまま
      element.margin[margin.handle] = Math.max(0, oldLogicalMargin + physicalMarginDelta * factor);
      element.calculateLengthAndBreadth();
      this.constraintTree(margin.layout);
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  getBorderBalance(p, border) {
    const layout = border.layout;
    const index = border.index;

    const child0 = layout.children[index - 1];
    const child1 = layout.children[index];

    const rect0 = rectFromPositionAndSize(child0.origin, child0.size);
    const rect1 = rectFromPositionAndSize(child1.origin, child1.size);

    let t; // 0.0 - 1.0, 0.0: top or left of rect0, 1.0: right or bottom of rect1
    if (layout.dir == "h") {
      t = (p[0] - rect0[0]) / (rect1[2] - rect0[0]);
    } else {
      t = (p[1] - rect0[1]) / (rect1[3] - rect0[1]);
    }
    return t;
  }

  constraintAll() {
    const layout = calculatePhysicalLayout(
      this.frameTree,
      this.getCanvasSize(),
      [0, 0]
    );
    this.constraintAllRecursive(layout);
  }

  constraintTree(layout) {
    const newLayout = calculatePhysicalLayout(
      layout.element,
      layout.size,
      layout.origin
    );
    this.constraintAllRecursive(newLayout);
  }

  constraintAllRecursive(layout) {
    if (layout.children) {
      for (const child of layout.children) {
        this.constraintAllRecursive(child);
      }
    } else if (layout.element && layout.element.image) {
      this.constraintLeaf(layout);
    }
  }

  constraintLeaf(layout) {
    if (!layout.corners) {return; }
    if (!layout.element.image) { return; }
    const element = layout.element;
    const [x0, y0, x1, y1] = [
      Math.min(layout.corners.topLeft[0], layout.corners.bottomLeft[0]),
      Math.min(layout.corners.topLeft[1], layout.corners.topRight[1]),
      Math.max(layout.corners.topRight[0], layout.corners.bottomRight[0]),
      Math.max(layout.corners.bottomLeft[1], layout.corners.bottomRight[1]),
    ]
    const [w, h] = [x1 - x0, y1 - y0];

    let scale = element.scale[0];
    if (element.image.width * scale < w) {
      scale = w / element.image.width;
    }
    if (element.image.height * scale < h) {
      scale = h / element.image.height;
    }
    element.scale = [scale, scale];

    const [rw, rh] = [
      element.image.width * scale,
      element.image.height * scale,
    ];
    const x = (x0 + x1) * 0.5 + element.translation[0];
    const y = (y0 + y1) * 0.5 + element.translation[1];

    if (x0 < x - rw / 2) {
      element.translation[0] = - (w - rw) / 2;
    }
    if (x + rw / 2 < x1) {
      element.translation[0] = (w - rw) / 2;
    }
    if (y0 < y - rh / 2) {
      element.translation[1] = - (h - rh) / 2;
    }
    if (y1 > y + rh / 2) {
      element.translation[1] = (h - rh) / 2;
    }

  }

  importImage(layoutlet, image) {
    const size = [image.width, image.height];
    // calc expansion to longer size
    const scale = Math.max(
      layoutlet.size[0] / size[0],
      layoutlet.size[1] / size[1]
    );

    layoutlet.element.translation = [0, 0];
    layoutlet.element.scale = [scale, scale];
    layoutlet.element.image = image;
    this.constraintLeaf(layoutlet);
    this.redraw();
  }
}
