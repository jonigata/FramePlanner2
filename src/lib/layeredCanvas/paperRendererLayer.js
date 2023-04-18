import { Layer } from "./layeredCanvas.js";
import { drawBubble, getPath, drawPath } from "./bubbleGraphic.js";
import { trapezoidBoundingRect, trapezoidPath } from "./trapezoid.js";
import { findLayoutAt, calculatePhysicalLayout } from "./frameTree.js";
import { drawHorizontalText, measureHorizontalText, drawVerticalText, measureVerticalText } from "./drawText.js";

export class PaperRendererLayer extends Layer {
  constructor() {
    super();

    this.rawBubbles = [];

    // leafでないframeのバックグラウンド(単色)
    this.backgrounds = []; // [{layout, inheritanceContext}] leafは含まない

    // leafの背景(単色)、画像、embedフキダシ、枠線
    this.foregrounds = []; // [{layout, inheritanceContext, embeddedBubbles:[bubble]}]

    // leafに属さないフキダシ
    this.floatingBubbles = [];
  }

  render(ctx) {
    const size = this.getPaperSize();
    const layout = calculatePhysicalLayout(this.frameTree, size, [0, 0]);

    this.setUpRenderData(layout);

    this.cutOut(ctx);

    for (let frame of this.backgrounds) {
      this.renderFrameBackground(ctx, frame.layout, frame.inheritanceContext);
    }

    this.foregrounds.sort((a, b) => a.layout.element.z - b.layout.element.z);
    for (let frame of this.foregrounds) {
      this.renderFrame(ctx, frame.layout, frame.inheritanceContext);
    }

    for (let bubble of this.floatingBubbles) {
      this.renderBubbleBackground(ctx, bubble);
      this.renderBubbleForeground(ctx, bubble);
    }

    this.rawBubbles = [];
    this.backgrounds = [];
    this.foregrounds = [];
    this.floatingBubbles = [];
  }

  cutOut(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgb(255,255,255, 1)";
    ctx.fillRect(0, 0, ...this.getPaperSize());
    ctx.restore();
  }

  setUpRenderData(layout) {
    const inheritanceContext = { borderColor: "black", borderWidth: 1 };
    this.setUpFrameTree(layout, inheritanceContext);
    this.setUpBubbles(layout, this.rawBubbles);
  }

  setUpFrameTree(layout, inheritanceContext, deferred) {
    if (layout.element.borderColor != null) { 
      inheritanceContext.borderColor = layout.element.borderColor;
    }
    if (layout.element.borderWidth != null) {
      inheritanceContext.borderWidth = layout.element.borderWidth;
    }

    if (layout.children) {
      this.backgrounds.push({layout, inheritanceContext});
      for (let i = 0; i < layout.children.length; i++) {
        this.setUpFrameTree(layout.children[i], inheritanceContext, deferred);
      }
    } else {
      this.backgrounds.push({layout, inheritanceContext});
      this.foregrounds.push({layout, inheritanceContext});
    }
  }

  setUpBubbles(layout, bubbles) {
    this.resolveLinkages(bubbles);

    for (let bubble of bubbles) {
      if (bubble.embedded) {
        const thisLayout = findLayoutAt(layout, bubble.center);
        if (thisLayout) {
          thisLayout.bubbles ||= [];
          thisLayout.bubbles.push(bubble);
          continue;
        }
      }
      this.floatingBubbles.push(bubble);
    }
  }

  resolveLinkages(bubbles) {
    // 親子関係解決
    // ちょっとお行儀が悪く、unitedPathやchildrenを書き換えている
    const bubbleDic = {};
    for (let bubble of bubbles) {
      bubble.unitedPath = null;
      bubble.children = [];
      bubbleDic[bubble.uuid] = bubble;
    }

    for (let bubble of bubbles) {
      if (bubble.parent) {
        bubbleDic[bubble.parent].children.push(bubble);
      }
    }

    // 結合
    for (let bubble of bubbles) {
      if (0 < bubble.children.length) {
        bubble.unitedPath = this.uniteBubble([bubble, ...bubble.children]);
      }
    }
  }

  renderFrame(ctx, layout, inheritanceContext) {
    // ■■■ visibility 0;
    this.renderFrameBackground(ctx, layout, inheritanceContext);

    const element = layout.element;
    if (element.visibility < 1) { return; }

    // ■■■ visibility 1;
    if (element.image || 0 < layout.bubbles?.length) {
      // clip
      ctx.save();
      ctx.clip();

      if (element.image) {
        this.drawImage(ctx, layout);
      }

      if (layout.bubbles) {
        for (let bubble of layout.bubbles) {
          this.renderBubbleBackground(ctx, bubble);
          this.renderBubbleForeground(ctx, bubble);
        }
      }
  
      // unclip
      ctx.restore();
    }

    if (element.visibility < 2) { return; }

    // ■■■ visility 2;
    const borderWidth = inheritanceContext.borderWidth;
    if (0 < borderWidth) {
      ctx.beginPath();
      ctx.strokeStyle = inheritanceContext.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = "miter";
      trapezoidPath(ctx, layout.corners);
      ctx.stroke();
    }
  }

  renderFrameBackground(ctx, layout, inheritanceContext) {
    if (layout.element.visibilty === 0) { return; }

    ctx.beginPath();
    ctx.lineJoin = "miter";
    trapezoidPath(ctx, layout.corners);
  
    if (!layout.element.bgColor) { return; }
    ctx.fillStyle = layout.element.bgColor;
    ctx.fill();
  }

  renderBubbleBackground(ctx, bubble) {
    const rect = bubble.centeredRect;
    const [x, y, w, h] = rect;

    ctx.save();
    ctx.translate(...bubble.center);
    ctx.rotate((-bubble.rotation * Math.PI) / 180);

    // fill/stroke設定
    ctx.fillStyle = bubble.hasEnoughSize() ? bubble.fillColor : "rgba(255, 128, 0, 0.9)";;
    ctx.strokeStyle = 0 < bubble.strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.strokeWidth;

    // shape背景描画
    this.drawBubble(ctx, rect, 'fill', bubble);
    this.drawBubble(ctx, rect, 'clip', bubble);

    // 画像描画
    if (bubble.image && !bubble.parent) {
      const img = bubble.image;
      let iw = img.image.width * img.scale[0];
      let ih = img.image.height * img.scale[1];
      let ix = x + w * 0.5 - iw * 0.5 + img.translation[0];
      let iy = y + h * 0.5 - ih * 0.5 + img.translation[1];
      ctx.drawImage(bubble.image.image, ix, iy, iw, ih);
    }

    // テキスト描画
    if (bubble.text) {
      this.drawText(ctx, bubble);
    }

    ctx.restore();
  }

  renderBubbleForeground(ctx, bubble) {
    const rect = bubble.centeredRect;

    ctx.save();
    ctx.translate(...bubble.center);
    ctx.rotate((-bubble.rotation * Math.PI) / 180);

    // shape枠描画
    ctx.strokeStyle = 0 < bubble.strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.strokeWidth;
    this.drawBubble(ctx, rect, 'stroke', bubble);

    ctx.restore();
  }

  drawBubble(ctx, rect, method, bubble) {
    ctx.bubbleDrawMethod = method; // 行儀が悪い
    if (bubble.unitedPath) {
      drawPath(ctx, bubble.unitedPath);
    } else if (!bubble.parent) {
      drawBubble(ctx, bubble.text, rect, bubble.shape, bubble.optionContext);
    }
  }

  drawImage(ctx, layout) {
    const element = layout.element;
    const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);

    ctx.save();
    ctx.translate((x0 + x1) * 0.5 + element.translation[0], (y0 + y1) * 0.5 + element.translation[1]);
    ctx.scale(element.scale[0] * element.reverse[0], element.scale[1] * element.reverse[1]);
    ctx.translate(-element.image.width * 0.5, -element.image.height * 0.5);
    ctx.drawImage(element.image, 0, 0);
    ctx.restore();
  }

  drawText(ctx, bubble) {
    const baselineSkip = bubble.fontSize * 1.5;
    const charSkip = bubble.fontSize;

    // draw text
    ctx.fillStyle = bubble.fontColor;
    const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${bubble.fontSize}px '${bubble.fontFamily}'`;
    ctx.font = ss;

    const [cx, cy] = bubble.offset;
    const [w, h] = bubble.size;
    if (bubble.direction == 'v') {
      const textMaxHeight = h * 0.85;
      const m = measureVerticalText(ctx,textMaxHeight,bubble.text,baselineSkip,charSkip);
      const tw = m.width;
      const th = m.height;
      const tx = cx - tw * 0.5;
      const ty = cy - th * 0.5;
      drawVerticalText(ctx,{ x: tx, y: ty, width: tw, height: th },bubble.text,baselineSkip,charSkip);
    } else {
      const textMaxWidth = w * 0.85;
      const m = measureHorizontalText(ctx,textMaxWidth,bubble.text,baselineSkip);
      const tw = m.width;
      const th = m.height;
      const tx = cx - tw * 0.5;
      const ty = cy - th * 0.5;
      // ctx.strokeRect(tx, ty, tw, th);
      drawHorizontalText(ctx,{ x: tx, y: ty, width: tw, height: th },bubble.text,baselineSkip,m);
    }
  }

  uniteBubble(bubbles) {
    let path = null;
    for (let bubble of bubbles) {
      const [x, y, w, h] = bubble.regularizedPositionAndSize();
      const path2 = getPath(bubble.shape, [x, y, w, h], bubble.optionContext, bubble.text);
      path2.rotate(-bubble.rotation, bubble.center);
      path = path ? path.unite(path2) : path2;
    }
    path.rotate(bubbles[0].rotation, bubbles[0].center);
    path.translate(new paper.Point(bubbles[0].center).multiply(-1));
    return path;
  }

  setBubbles(bubbles) {
    this.rawBubbles = bubbles;
  }

  setFrameTree(frameTree) {
    this.frameTree = frameTree;
  }

}