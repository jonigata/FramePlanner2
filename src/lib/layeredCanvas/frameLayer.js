import { Layer } from "./layeredCanvas.js";
import { FrameElement, calculatePhysicalLayout, findLayoutAt, findBorderAt, makeBorderRect, rectFromPositionAndSize } from "./frameTree.js";
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
    this.transparentPattern = new Image();
    this.transparentPattern.src = new URL(
      "../../assets/transparent.png",
      import.meta.url
    ).href;
  }

  render(ctx) {
    const size = this.getCanvasSize();

    // fill background
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgb(255,255,255, 1)";
    ctx.fillRect(0, 0, size[0], size[1]);
    ctx.restore();

    const layout = calculatePhysicalLayout(this.frameTree, size, [0, 0]);
    this.renderElement(ctx, layout);
    if (!this.interactable) {
      return;
    }

    if (this.borderRect) {
      ctx.fillStyle = "rgba(0,200,200,0.7)";
      ctx.fillRect(
        this.borderRect[0],
        this.borderRect[1],
        this.borderRect[2] - this.borderRect[0],
        this.borderRect[3] - this.borderRect[1]
      );
      if (this.focusedBorder.layout.dir === "v") {
        this.expandVerticalIcon.position = [
          this.borderRect[2] - 32,
          (this.borderRect[1] + this.borderRect[3]) * 0.5 - 16,
        ];
        this.expandVerticalIcon.render(ctx);
      } else {
        this.expandHorizontalIcon.position = [
          (this.borderRect[0] + this.borderRect[2]) * 0.5 - 16,
          this.borderRect[3] - 32,
        ];
        this.expandHorizontalIcon.render(ctx);
      }
    }

    if (this.focusedLayout && !this.pointerHandler) {
      this.splitHorizontalIcon.render(ctx);
      this.splitVerticalIcon.render(ctx);
      this.deleteIcon.render(ctx);
      if (this.focusedLayout.element.image) {
        this.scaleIcon.render(ctx);
      }
    }
  }

  renderElement(ctx, layout) {
    this.renderBackground(ctx, layout);

    if (layout.children) {
      for (let i = 0; i < layout.children.length; i++) {
        this.renderElement(ctx, layout.children[i]);
      }
    } else {
      this.renderElementLeaf(ctx, layout);
    }
  }

  renderElementLeaf(ctx, layout) {
    const origin = layout.origin;
    const size = layout.size;

    this.renderBackground(ctx, layout);

    const element = layout.element;
    if (element.image) {
      // clip
      ctx.save();
      ctx.beginPath();
      ctx.rect(origin[0], origin[1], size[0], size[1]);
      ctx.clip();

      const scale = element.scale[0]; // 今のところxとyは同じ
      const [rw, rh] = [
        element.image.width * scale,
        element.image.height * scale,
      ];

      let x = origin[0] + (size[0] - rw) / 2 + element.translation[0];
      let y = origin[1] + (size[1] - rh) / 2 + element.translation[1];

      ctx.drawImage(
        element.image,
        x,
        y,
        element.image.width * scale,
        element.image.height * scale
      );

      // unclip
      ctx.restore();
    }

    if (layout.element.bgColor !== "transparent") {
      ctx.strokeStyle = "rgb(0,0,0)";
      ctx.lineWidth = 1;
      ctx.strokeRect(origin[0], origin[1], size[0], size[1]);
    }
  }

  renderBackground(ctx, layout) {
    const origin = layout.origin;
    const size = layout.size;

    let bgColor = layout.element.bgColor;
    if (bgColor == "transparent") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgb(255,255,255, 1)";
      ctx.fillRect(origin[0], origin[1], size[0], size[1]);
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(origin[0], origin[1], size[0], size[1]);
    }
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
    const border = findBorderAt(layout, point);
    if (border) {
      this.borderRect = makeBorderRect(border.layout, border.index);
      this.focusedBorder = border;
      this.focusedLayout = null;
    } else {
      this.borderRect = null;
      this.focusedBorder = null;
      this.focusedLayout = findLayoutAt(layout, point);
      if (this.focusedLayout) {
        const origin = this.focusedLayout.origin;
        const size = this.focusedLayout.size;
        const [x, y] = [origin[0] + size[0] / 2, origin[1] + size[1] / 2];
        this.splitHorizontalIcon.position = [x + 32, y];
        this.splitVerticalIcon.position = [x, y + 32];
        this.deleteIcon.position = [origin[0] + size[0] - 32, origin[1]];
        this.scaleIcon.position = [origin[0] + size[0] - 32, origin[1] + size[1] - 32];
        if (this.interactable) {
          if (this.splitHorizontalIcon.contains(point)) {
            this.hint(this.splitHorizontalIcon.hintPosition, "横に分割");
          } else if (this.splitVerticalIcon.contains(point)) {
            this.hint(this.splitVerticalIcon.hintPosition, "縦に分割");
          } else if (this.deleteIcon.contains(point)) {
            this.hint(this.deleteIcon.hintPosition, "削除");
          } else if (this.scaleIcon.contains(point)) {
            if (this.focusedLayout.element.image) {
              this.hint(this.scaleIcon.hintPosition, "スケール");
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
      } else {
        this.hint(point, null);
      }
    }
    this.redraw();
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
    const layoutElement = findLayoutAt(layout, point);
    if (layoutElement) {
      if (keyDownFlags["KeyQ"]) {
        FrameElement.eraseElement(this.frameTree, layoutElement.element);
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyW"]) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layoutElement.element
        );
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (keyDownFlags["KeyS"]) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layoutElement.element
        );
        this.onCommit(this.frameTree);
        this.redraw();
      }
      if (this.splitHorizontalIcon.contains(point)) {
        FrameElement.splitElementHorizontal(
          this.frameTree,
          layoutElement.element
        );
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.splitVerticalIcon.contains(point)) {
        FrameElement.splitElementVertical(
          this.frameTree,
          layoutElement.element
        );
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (this.deleteIcon.contains(point)) {
        FrameElement.eraseElement(this.frameTree, layoutElement.element);
        this.onCommit(this.frameTree);
        this.focusedLayout = null;
        this.redraw();
      }
      if (layoutElement.element.image) {
        console.log("accepts");
        return { layout: layoutElement };
      }
    }

    const border = findBorderAt(layout, point);
    if (border) {
      return { border: border };
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
          this.constraintTranslationAndScale(layout);
          this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
        });
      } else {
        const origin = element.translation;
        yield* translate(p, (q) => {
          element.translation = [origin[0] + q[0], origin[1] + q[1]];
          this.constraintTranslationAndScale(layout);
          this.redraw(); // TODO: できれば、移動した要素だけ再描画したい
        });
      }
    } else {
      if (
        keyDownFlags["ControlLeft"] ||
        keyDownFlags["ControlRight"] ||
        this.expandHorizontalIcon.contains(p) ||
        this.expandVerticalIcon.contains(p)
      ) {
        yield* this.expandBorder(p, payload.border);
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
    const rawSpacing = layout.element.spacing;
    const rawSum = c0.rawSize + rawSpacing + c1.rawSize;

    while ((p = yield)) {
      const balance = this.getBorderBalance(p, border);
      const t = balance * rawSum;
      c0.rawSize = t - rawSpacing * 0.5;
      c1.rawSize = rawSum - t - rawSpacing * 0.5;
      this.redraw();
    }

    this.onCommit(this.frameTree);
  }

  *expandBorder(p, border) {
    const element = border.layout.element;
    const rawSpacing = element.spacing;
    const dir = border.layout.dir == "h" ? 0 : 1;
    const factor = border.layout.size[dir] / this.getCanvasSize()[dir];
    const s = p;

    while ((p = yield)) {
      const op = border.layout.dir == "h" ? p[0] - s[0] : p[1] - s[1];
      element.spacing = Math.max(0, rawSpacing + op * factor * 0.1);
      element.calculateLengthAndBreadth();
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

  constraintAllRecursive(layout) {
    if (layout.children) {
      for (const child of layout.children) {
        this.constraintAllRecursive(child);
      }
    } else if (layout.element && layout.element.image) {
      this.constraintTranslationAndScale(layout);
    }
  }

  constraintTranslationAndScale(layout) {
    const element = layout.element;
    const origin = layout.origin;
    const size = layout.size;

    let scale = element.scale[0];
    if (element.image.width * scale < size[0]) {
      scale = size[0] / element.image.width;
    }
    if (element.image.height * scale < size[1]) {
      scale = size[1] / element.image.height;
    }
    element.scale = [scale, scale];

    const [rw, rh] = [
      element.image.width * scale,
      element.image.height * scale,
    ];
    const [x0, y0] = [origin[0], origin[1]];
    const [x1, y1] = [origin[0] + size[0], origin[1] + size[1]];
    const x = origin[0] + (size[0] - rw) / 2 + element.translation[0];
    const y = origin[1] + (size[1] - rh) / 2 + element.translation[1];

    if (x0 < x) {
      element.translation[0] = x0 - origin[0] - (size[0] - rw) / 2;
    }
    if (x + rw < x1) {
      element.translation[0] = x1 - origin[0] - (size[0] - rw) / 2 - rw;
    }
    if (y0 < y) {
      element.translation[1] = y0 - origin[1] - (size[1] - rh) / 2;
    }
    if (y + rh < y1) {
      element.translation[1] = y1 - origin[1] - (size[1] - rh) / 2 - rh;
    }
  }

  importImage(layoutlet, image) {
    const size = [image.width, image.height];
    // calc expansion to longer size
    console.log(layoutlet.size, size);
    const scale = Math.max(
      layoutlet.size[0] / size[0],
      layoutlet.size[1] / size[1]
    );
    console.log(scale);

    layoutlet.element.scale = [scale, scale];
    layoutlet.element.image = image;
    this.redraw();
  }
}
