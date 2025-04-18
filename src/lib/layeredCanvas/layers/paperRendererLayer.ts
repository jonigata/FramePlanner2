import { reverse2D } from "../tools/geometry/geometry";
import { LayerBase } from "../system/layeredCanvas";
import { getPath } from "../tools/draw/bubbleGraphic";
import { trapezoidBoundingRect, trapezoidPath } from "../tools/geometry/trapezoid";
import { findLayoutAt, calculatePhysicalLayout, FrameElement } from "../dataModels/frameTree";
import { drawFilmStack } from "../tools/draw/drawFilmStack";
import type { Layout } from "../dataModels/frameTree";
import type { Bubble, BubbleRenderInfo } from "../dataModels/bubble";
import { makePlainCanvas } from "../tools/imageUtil";
import { renderBubbles, renderBubbleBackground, renderBubbleForeground } from "../tools/draw/renderBubble";

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

export class PaperRendererLayer extends LayerBase {
  frameTree: FrameElement | null = null;
  rawBubbles: Bubble[] | null = null;
  thisFrameRenderData: RenderData | null = null;

  constructor(private supportsDpr: boolean) {
    super();
  }

  renderDepths(): number[] { return [0,1]; }

  prerender() {
    const size = this.getPaperSize();
    const layout = calculatePhysicalLayout(this.frameTree!, size, [0, 0]);
    this.thisFrameRenderData = this.setUpRenderData(layout);
  }

  render(ctx: CanvasRenderingContext2D, depth: number) {
    const { backgrounds, foregrounds, embeddedBubbles, floatingBubbles } = this.thisFrameRenderData!;

    if (depth === 0) {
      for (let { layout } of backgrounds) {
        this.renderFrameBackground(ctx, layout);
      }
      foregrounds.sort((a, b) => a.layout.element.z - b.layout.element.z);
      for (let { layout, inheritanceContext } of foregrounds) {
        this.renderFrame(ctx, layout, inheritanceContext, embeddedBubbles);
      }
    }

    if (depth === 1) {
      renderBubbles(ctx, this.getPaperSize(), floatingBubbles);
    }
  }

  setUpRenderData(layout: Layout): RenderData {
    const inheritanceContext = { borderColor: "black", borderWidth: 1 };
    const { backgrounds, foregrounds } = this.setUpFrameTree(layout, inheritanceContext);
    const { embeddedBubbles, floatingBubbles } = this.setUpBubbles(layout, this.rawBubbles!);
    return { backgrounds, foregrounds, embeddedBubbles, floatingBubbles };
  }

  setUpFrameTree(layout: Layout, inheritanceContext: InheritanceContext): { backgrounds: { layout: Layout, inheritanceContext: InheritanceContext }[], foregrounds: { layout: Layout, inheritanceContext: InheritanceContext }[] } {
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
    const paperSize = this.getPaperSize();

    this.resolveLinkages(bubbles);

    const embeddedBubbles: EmbeddedBubbles = new Map();
    const floatingBubbles = [];

    for (let bubble of bubbles) {
      if (bubble.embedded) {
        const thisLayout = findLayoutAt(layout, bubble.getPhysicalCenter(paperSize), 0);
        if (thisLayout && 0 < thisLayout.element.visibility && thisLayout.element.isLeaf()) {
          if (!embeddedBubbles.has(thisLayout)) {
            embeddedBubbles.set(thisLayout, []);
          }
          embeddedBubbles.get(thisLayout)!.push(bubble);
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
    const paperSize = this.getPaperSize();

    // 初期化
    const bubbleDic: {[key: string]: Bubble} = {};
    for (let bubble of bubbles) {
      bubble.renderInfo ??= {} as BubbleRenderInfo;
      bubble.renderInfo.unitedPath = null;
      bubble.renderInfo.children = [];
      // pathJson, pathは持ち越す
      bubbleDic[bubble.uuid] = bubble;
    }

    // 親子関係解決
    for (let bubble of bubbles) {
      if (bubble.parent) {
        if (bubbleDic[bubble.parent] == null) {
          bubble.parent = null;
        } else {
          bubbleDic[bubble.parent].renderInfo!.children.push(bubble);
        }
      }
    }

    // パス作成
    for (let bubble of bubbles) {
      const n_size = [bubble.n_p1[0] - bubble.n_p0[0], bubble.n_p1[1] - bubble.n_p0[1]];
      const ri = bubble.renderInfo!;
      const c = {
        paperSize: paperSize,
        shape: bubble.shape,
        size: n_size,
        optionContext: bubble.optionContext,
        rotation: bubble.rotation,
      }
      const json = JSON.stringify(c);
      // console.log(`${c} took ${performance.now() - startTime} ms, ${json.length} bytes`);
      if (ri.pathJson != json) {
        // 変更が起きたときのみ
        // const startTime = performance.now();
        const size = bubble.getPhysicalSize(paperSize);
        ri.pathJson = json;
        ri.path = getPath(bubble.shape, size, bubble.optionContext, bubble.text);
        ri.path?.rotate(-bubble.rotation);
        // console.log(`${json} took ${performance.now() - startTime} ms, ${json.length} bytes`);
      }
    }

    // 結合
    for (let bubble of bubbles) {
      const ri = bubble.renderInfo!;
      if (bubble.parent == null && ri.path) {
        const center = bubble.getPhysicalCenter(paperSize);
        ri.unitedPath = ri.path.clone();
        ri.unitedPath.translate(center);
        for (let child of ri.children) {
          const ri2 = child.renderInfo!;
          const path2 = ri2.path!.clone();
          path2.translate(child.getPhysicalCenter(paperSize));
          ri.unitedPath = ri.unitedPath.unite(path2);
        }
        ri.unitedPath.rotate(bubble.rotation, center);
        ri.unitedPath.translate(reverse2D(center));
      }
    }
  }

  renderFrame(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext, embeddedBubbles: EmbeddedBubbles) {
    // ■■■ visibility 0;
    this.renderFrameBackground(ctx, layout);

    const element = layout.element;
    if (element.visibility < 1) { return; }

    // ■■■ visibility 1;
    this.renderFrameContent(ctx, layout, embeddedBubbles);
    if (element.visibility < 2) { return; }

    // ■■■ visility 2;
    this.renderFrameBorder(ctx, layout, inheritanceContext);
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

  // visibility 1
  renderFrameContent(ctx: CanvasRenderingContext2D, layout: Layout, embeddedBubbles: EmbeddedBubbles) {
    const element = layout.element;
    if (0 < element.filmStack.films.length || embeddedBubbles.has(layout)) {
      // clip
      ctx.save();
      if (!element.focused) {
        ctx.clip(); // this.renderFrameBackgroundで描画したものをクリップ
      }

      this.drawFilms(ctx, layout);

      if (embeddedBubbles.has(layout)) {
        const bubbles = embeddedBubbles.get(layout)!;
        renderBubbles(ctx, this.getPaperSize(), bubbles);
      }
  
      // unclip
      ctx.restore();
    }
  }


  renderFrameBorder(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext) {
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

  // バブル描画関連のコードはsrc/lib/layeredCanvas/tools/draw/renderBubble.tsに移動

  drawFilms(ctx: CanvasRenderingContext2D, layout: Layout) {
    const paperSize = this.getPaperSize();
    const element = layout.element;

    const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
    ctx.save();
    ctx.translate(x0 + w * 0.5, y0 + h * 0.5);
    drawFilmStack(ctx, element.filmStack, paperSize);
    ctx.restore();
  }

  // バブル描画関連のコードはsrc/lib/layeredCanvas/tools/draw/renderBubble.tsに移動

  setBubbles(bubbles: Bubble[]) {
    this.rawBubbles = bubbles;
  }

  setFrameTree(frameTree: FrameElement) {
    this.frameTree = frameTree;
  }

  renderApart(): { frames: {border: HTMLCanvasElement, content: HTMLCanvasElement}[], bubbles: HTMLCanvasElement[] } {
    const size = this.getPaperSize();

    function makeCanvas() {
      const canvas = makePlainCanvas(size[0], size[1]);
      const ctx = canvas.getContext('2d')!;
      return { canvas, ctx };
    }

    const layout = calculatePhysicalLayout(this.frameTree!, size, [0, 0]);

    const { foregrounds, embeddedBubbles, floatingBubbles } = this.setUpRenderData(layout);

    const canvases = [];

    foregrounds.sort((a, b) => a.layout.element.z - b.layout.element.z);
    for (let { layout, inheritanceContext } of foregrounds) {
      if (layout.element.visibility < 1) { continue; }
      const { canvas: border } = makeCanvas();
      const { canvas: content } = makeCanvas();

      const ctx = content.getContext('2d')!;
      this.renderFrameBackground(ctx, layout);
      this.renderFrameContent(ctx, layout, embeddedBubbles);

      const ctx2 = border.getContext('2d')!;
      this.renderFrameBorder(ctx2, layout, inheritanceContext);

      canvases.push({ border, content });
    }

    const bubbles: Bubble[] = [...[...embeddedBubbles.values()].flat(), ...floatingBubbles];
    const bubbleCanvases: {[key:string]: HTMLCanvasElement} = {};

    for (let bubble of bubbles) {
      const ri = bubble.renderInfo;
      if (bubble.parent != null) { continue; }
      const { canvas, ctx } = makeCanvas();
      const paperSize = this.getPaperSize();
      renderBubbleBackground(ctx, paperSize, bubble);
      renderBubbleForeground(ctx, paperSize, bubble, false);
      bubbleCanvases[bubble.uuid] = canvas;
    }
    for (let bubble of bubbles) {
      if (bubble.parent == null) { continue; }
      const ctx = bubbleCanvases[bubble.parent].getContext('2d')!;
      renderBubbleForeground(ctx, this.getPaperSize(), bubble, true);
    }

    return { frames: canvases, bubbles: Object.values(bubbleCanvases) };
  }

  resetCache(){
    for (let bubble of this.rawBubbles!) {
      bubble.renderInfo = undefined;
    }
  }
}