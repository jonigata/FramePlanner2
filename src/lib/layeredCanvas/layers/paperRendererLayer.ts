import { type Vector, reverse2D } from "../tools/geometry/geometry";
import { drawBubble, getPath, drawPath } from "../tools/draw/bubbleGraphic";
import { trapezoidBoundingRect, trapezoidPath } from "../tools/geometry/trapezoid";
import { findLayoutAt, calculatePhysicalLayout, FrameElement } from "../dataModels/frameTree";
import type { Layout } from "../dataModels/frameTree";
import { drawText, measureText } from "../tools/draw/drawText";
import { Layer } from "../system/layeredCanvas";
import type { Bubble, BubbleRenderInfo } from "../dataModels/bubble";

type InheritanceContext = {
  borderColor: string, 
  borderWidth: number 
};

type EmbeddedBubbles = Map<Layout, Bubble[]>;

type RenderData = {
  backgrounds: {
    layout: Layout, 
    inheritanceContext: InheritanceContext
  }[], 
  foregrounds: {
    layout: Layout, 
    inheritanceContext: InheritanceContext
  }[], 
  embeddedBubbles: EmbeddedBubbles,
  floatingBubbles: Bubble[]
};

export class PaperRendererLayer extends Layer {
  frameTree: FrameElement;
  rawBubbles: Bubble[];

  constructor() {
    super();
  }

  render(ctx: CanvasRenderingContext2D) {
    const size = this.getPaperSize();
    const layout = calculatePhysicalLayout(this.frameTree, size, [0, 0]);

    const { backgrounds, foregrounds, embeddedBubbles, floatingBubbles } = this.setUpRenderData(layout);

    this.cutOut(ctx);

    for (let { layout } of backgrounds) {
      this.renderFrameBackground(ctx, layout);
    }

    foregrounds.sort((a, b) => a.layout.element.z - b.layout.element.z);
    for (let { layout, inheritanceContext } of foregrounds) {
      this.renderFrame(ctx, layout, inheritanceContext, embeddedBubbles);
    }

    this.renderBubbles(ctx, floatingBubbles);
  }

  cutOut(ctx: CanvasRenderingContext2D) {
    // 外側を透明にする
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgb(255,255,255, 1)";
    ctx.fillRect(0, 0, ...this.getPaperSize());
    ctx.restore();
  }

  setUpRenderData(layout: Layout): RenderData {
    const inheritanceContext = { borderColor: "black", borderWidth: 1 };
    const { backgrounds, foregrounds } = this.setUpFrameTree(layout, inheritanceContext);
    const { embeddedBubbles, floatingBubbles } = this.setUpBubbles(layout, this.rawBubbles);
    return { backgrounds, foregrounds, embeddedBubbles, floatingBubbles };
  }

  setUpFrameTree(layout: Layout, inheritanceContext: InheritanceContext) {
    // leafでないframeのバックグラウンド(単色)
    const backgrounds = []; // [{layout, inheritanceContext}] leafは含まない
    // leafの背景(単色)、画像、embedフキダシ、枠線
    const foregrounds = []; // [{layout, inheritanceContext, embeddedBubbles:[bubble]}]

    if (layout.element.borderColor != null) { 
      inheritanceContext.borderColor = layout.element.borderColor;
    }
    if (layout.element.borderWidth != null) {
      inheritanceContext.borderWidth = layout.element.borderWidth;
    }

    if (layout.children) {
      backgrounds.push({layout, inheritanceContext});
      for (let i = 0; i < layout.children.length; i++) {
        const frames = this.setUpFrameTree(layout.children[i], inheritanceContext);
        backgrounds.push(...frames.backgrounds);
        foregrounds.push(...frames.foregrounds);
      }
    } else {
      backgrounds.push({layout, inheritanceContext});
      foregrounds.push({layout, inheritanceContext});
    }

    return { backgrounds, foregrounds };
  }

  setUpBubbles(layout: Layout, bubbles: Bubble[]) {
    this.resolveLinkages(bubbles);

    const embeddedBubbles: EmbeddedBubbles = new Map();
    const floatingBubbles = [];

    for (let bubble of bubbles) {
      if (bubble.embedded) {
        const thisLayout = findLayoutAt(layout, bubble.center);
        if (thisLayout && 0 < thisLayout.element.visibility && thisLayout.element.isLeaf()) {
          if (!embeddedBubbles.has(thisLayout)) {
            embeddedBubbles.set(thisLayout, []);
          }
          embeddedBubbles.get(thisLayout).push(bubble);
        } else {
          floatingBubbles.push(bubble);
        }
      } else {
        floatingBubbles.push(bubble);
      }
    }

    return { embeddedBubbles, floatingBubbles };
  }

  resolveLinkages(bubbles: Bubble[]) {
    // 親子関係解決
    // ちょっとお行儀が悪く、path, unitedPath, childrenを書き換えている
    const bubbleDic: {[key: string]: Bubble} = {};
    for (let bubble of bubbles) {
      bubble.renderInfo ??= {} as BubbleRenderInfo;
      bubble.renderInfo.unitedPath = null;
      bubble.renderInfo.children = [];
      bubbleDic[bubble.uuid] = bubble;
    }

    for (let bubble of bubbles) {
      if (bubble.parent) {
        bubbleDic[bubble.parent].renderInfo.children.push(bubble);
      }
    }

    // パス作成
    for (let bubble of bubbles) {
      const ri = bubble.renderInfo;
      const c = {
        shape: bubble.shape,
        size: bubble.size,
        optionContext: bubble.optionContext,
        rotation: bubble.rotation,
      }
      const json = JSON.stringify(c);
      // console.log(`${c} took ${performance.now() - startTime} ms, ${json.length} bytes`);
      if (ri.pathJson != json) {
        // 変更が起きたときのみ
        // const startTime = performance.now();
        ri.pathJson = json;
        ri.path = getPath(bubble.shape, bubble.size, bubble.optionContext, bubble.text);
        ri.path?.rotate(-bubble.rotation);
        // console.log(`${json} took ${performance.now() - startTime} ms, ${json.length} bytes`);
      }
    }

    // 結合
    for (let bubble of bubbles) {
      const ri = bubble.renderInfo;
      if (bubble.parent) {
        ri.unitedPath = null;
      } else if (ri.path) {
        ri.unitedPath = ri.path.clone();
        ri.unitedPath.translate(bubble.center);
        for (let child of ri.children) {
          const path2 = ri.path.clone();
          path2.translate(child.center);
          ri.unitedPath = ri.unitedPath.unite(path2);
        }
        ri.unitedPath.rotate(bubble.rotation, bubble.center);
        ri.unitedPath.translate(reverse2D(bubble.center));
      }
    }
  }

  renderFrame(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext, embeddedBubbles: EmbeddedBubbles) {
    // ■■■ visibility 0;
    this.renderFrameBackground(ctx, layout);

    const element = layout.element;
    if (element.visibility < 1) { return; }

    // ■■■ visibility 1;
    if (element.image || embeddedBubbles.has(layout)) {
      // clip
      ctx.save();
      if (!element.focused) {
        ctx.clip(); // this.renderFrameBackgroundで描画したものをクリップ
      }

      if (element.image) {
        this.drawImage(ctx, layout);
        if (element.focused) {
          this.drawImageFrame(ctx, layout);
        }
      }

      if (embeddedBubbles.has(layout)) {
        const bubbles = embeddedBubbles.get(layout);
        this.renderBubbles(ctx, bubbles);
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

  renderFrameBackground(ctx: CanvasRenderingContext2D, layout: Layout) {
    if (layout.element.visibility === 0) { return; }

    ctx.beginPath();
    ctx.lineJoin = "miter";
    trapezoidPath(ctx, layout.corners);
  
    if (!layout.element.bgColor) { return; }
    ctx.fillStyle = layout.element.bgColor;
    ctx.fill();
  }

  renderBubbles(ctx: CanvasRenderingContext2D, bubbles: Bubble[]) {
    for (let bubble of bubbles) {
      this.renderBubbleBackground(ctx, bubble);
      this.renderBubbleForeground(ctx, bubble, false);
    }
    for (let bubble of bubbles) {
      this.renderBubbleForeground(ctx, bubble, true);
    }
  }

  renderBubbleBackground(ctx: CanvasRenderingContext2D, bubble: Bubble) {
    if (bubble.parent) { return; }

    const size = bubble.size;

    ctx.save();
    ctx.translate(...bubble.center);
    ctx.rotate((-bubble.rotation * Math.PI) / 180);

    // fill/stroke設定
    ctx.fillStyle = bubble.hasEnoughSize() ? bubble.fillColor : "rgba(255, 128, 0, 0.9)";;
    ctx.strokeStyle = 0 < bubble.strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.strokeWidth;
    
    // shape背景描画
    this.drawBubble(ctx, size, 'fill', bubble);
    this.drawBubble(ctx, size, 'clip', bubble);

    // 画像描画
    if (bubble.image) {
      const img = bubble.image;
      let iw = img.image.naturalWidth * img.scale[0];
      let ih = img.image.naturalHeight * img.scale[1];
      let ix = - iw * 0.5 + img.translation[0];
      let iy = - ih * 0.5 + img.translation[1];
      ctx.drawImage(bubble.image.image, ix, iy, iw, ih);
    }

    ctx.restore();
  }

  renderBubbleForeground(ctx: CanvasRenderingContext2D, bubble: Bubble, drawsUnited: boolean) {
    if (bubble.parent) {
      if (!drawsUnited) { return; }
    } else {
      if (drawsUnited) { return; }
    }

    const size = bubble.size;

    ctx.save();
    ctx.translate(...bubble.center);
    ctx.rotate((-bubble.rotation * Math.PI) / 180);

    ctx.save();
    this.drawBubble(ctx, size, 'clip', bubble);

    // テキスト描画
    if (bubble.text) {
      this.drawText(ctx, bubble);
    }
    ctx.restore();

    // shape枠描画
    ctx.strokeStyle = 0 < bubble.strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.strokeWidth;
    this.drawBubble(ctx, size, 'stroke', bubble);

    ctx.restore();
  }

  drawBubble(ctx: CanvasRenderingContext2D, size: Vector, method: string, bubble: Bubble) {
    ctx['bubbleDrawMethod'] = method; // 行儀が悪い
    const ri = bubble.renderInfo;
    if (ri.unitedPath) {
      drawPath(ctx, ri.unitedPath, bubble.optionContext);
    } else if (!bubble.parent) {
      if (ri.path) {
        drawPath(ctx, ri.path, bubble.optionContext);
      } else {
        drawBubble(ctx, bubble.text, size, bubble.shape, bubble.optionContext);
      }
    }
  }

  drawImage(ctx: CanvasRenderingContext2D, layout: Layout) {
    const element = layout.element;
    const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);

    ctx.save();
    ctx.translate((x0 + x1) * 0.5 + element.translation[0], (y0 + y1) * 0.5 + element.translation[1]);
    ctx.scale(element.scale[0] * element.reverse[0], element.scale[1] * element.reverse[1]);
    ctx.rotate(-element.rotation * Math.PI / 180);
    ctx.translate(-element.image.naturalWidth * 0.5, -element.image.naturalHeight * 0.5);
    ctx.drawImage(element.image, 0, 0, element.image.naturalWidth, element.image.naturalHeight);
    ctx.restore();
  }

  drawImageFrame(ctx: CanvasRenderingContext2D, layout: Layout) {
    const element = layout.element;
    const [x0, y0, x1, y1] = trapezoidBoundingRect(layout.corners);

    ctx.save();
    ctx.translate((x0 + x1) * 0.5 + element.translation[0], (y0 + y1) * 0.5 + element.translation[1]);
    ctx.scale(element.scale[0] * element.reverse[0], element.scale[1] * element.reverse[1]);
    ctx.translate(-element.image.naturalWidth * 0.5, -element.image.naturalHeight * 0.5);
    ctx.beginPath();
    ctx.rect(0, 0, element.image.naturalWidth, element.image.naturalHeight);
    ctx.strokeStyle = "rgb(0, 0, 255)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }


  drawText(targetCtx: CanvasRenderingContext2D, bubble: Bubble) {
    const [w, h] = bubble.size;
    if (w <= 0 || h <= 0) { return; }

    const ri = bubble.renderInfo;

    // let startTime = performance.now();

    const c = {
      size: bubble.size,
      offset: bubble.offset,
      fontStyle: bubble.fontStyle,
      fontWeight: bubble.fontWeight,
      fontSize: bubble.fontSize,
      fontFamily: bubble.fontFamily,
      text: bubble.text,
      direction: bubble.direction,
      autoNewline: bubble.autoNewline,
    };
    const json = JSON.stringify(c);
    // console.log(`stringify took ${performance.now() - startTime} ms, ${json.length} bytes`);
    if (ri.textJson != json) {
      // startTime = performance.now();

      // 変更が起きたときのみ
      ri.textJson = json;

      if (!ri.textCanvas) {
        ri.textCanvas = document.createElement('canvas');
        ri.textCtx = ri.textCanvas.getContext('2d');
      }
  
      const canvas = ri.textCanvas;
      const ctx = ri.textCtx;
  
      canvas.width = w;
      canvas.height = h;
  
      ctx.translate(w * 0.5, h * 0.5);
      ctx.translate(...bubble.offset);
  
      const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${bubble.fontSize}px '${bubble.fontFamily}'`;
      ctx.font = ss; // horizontal measureより先にないとだめ
      //const text = `${bubble.text}:${bubble.pageNumber}`;
      const text = bubble.text;
  
      const baselineSkip = bubble.fontSize * 1.5;
      const charSkip = bubble.fontSize;
      const m = measureText(bubble.direction, ctx, w * 0.85, h * 0.85, text, baselineSkip, charSkip, bubble.autoNewline);
      const [tw, th] = [m.width, m.height];
      const r = { x: - tw * 0.5, y: - th * 0.5, width: tw, height: th };
  
      // 本体
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = bubble.fontColor;
      drawText(bubble.direction, ctx, 'fill', r, text, baselineSkip, charSkip, m, bubble.autoNewline);
  
      // フチ
      if (0 < bubble.outlineWidth) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.strokeStyle = bubble.outlineColor;
        ctx.lineWidth = bubble.outlineWidth;
        ctx.font = ss;
        ctx.lineJoin = 'round';
        drawText(bubble.direction, ctx, 'stroke', r, text, baselineSkip, charSkip, m, bubble.autoNewline);
      }

      // console.log(`rendering took ${performance.now() - startTime} ms`);
    }

    // 描き戻し
    const canvas = ri.textCanvas;
    try {
      const rotation = Math.round(bubble.rotation * 10) / 10;

      targetCtx.save();
      if (rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270) {
        targetCtx.imageSmoothingEnabled = false;
      } 
      targetCtx.drawImage(canvas, 0 - w * 0.5, 0 - h * 0.5, ...bubble.size);
      targetCtx.restore();
    }
    catch (e) {
      console.log(w, h, canvas.width, canvas.height, bubble.size);
      throw e;
    }
  }

  setBubbles(bubbles: Bubble[]) {
    this.rawBubbles = bubbles;
  }

  setFrameTree(frameTree: FrameElement) {
    this.frameTree = frameTree;
  }

  renderApart() {
    const size = this.getPaperSize();

    function makeCanvas() {
      const canvas = document.createElement('canvas');
      canvas.width = size[0];
      canvas.height = size[1];
      const ctx = canvas.getContext('2d');
      return { canvas, ctx };
    }

    const layout = calculatePhysicalLayout(this.frameTree, size, [0, 0]);

    const { foregrounds, embeddedBubbles, floatingBubbles } = this.setUpRenderData(layout);

    const canvases = [];

    foregrounds.sort((a, b) => a.layout.element.z - b.layout.element.z);
    for (let { layout, inheritanceContext } of foregrounds) {
      if (layout.element.visibility < 1) { continue; }
      const { canvas, ctx } = makeCanvas();
      this.renderFrame(ctx, layout, inheritanceContext, new Map());
      canvases.push(canvas);
    }

    const bubbles: Bubble[] = [...[...embeddedBubbles.values()].flat(), ...floatingBubbles];
    const bubbleCanvases = {};

    for (let bubble of bubbles) {
      const ri = bubble.renderInfo;
      if (bubble.parent != null) { continue; }
      const { canvas, ctx } = makeCanvas();
      this.renderBubbleBackground(ctx, bubble);
      this.renderBubbleForeground(ctx, bubble, false);
      bubbleCanvases[bubble.uuid] = canvas;
    }
    for (let bubble of bubbles) {
      if (bubble.parent == null) { continue; }
      const ctx = bubbleCanvases[bubble.parent].getContext('2d');
      this.renderBubbleForeground(ctx, bubble, true);
    }

    return { frames: canvases, bubbles: Object.values(bubbleCanvases) };
  }
}