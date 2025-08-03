import { reverse2D } from "../tools/geometry/geometry";
import { LayerBase } from "../system/layeredCanvas";
import { getPath } from "../tools/draw/bubbleGraphic";
import { makeFrameClip } from '../tools/geometry/frameGeometry';
import { trapezoidBoundingRect } from "../tools/geometry/trapezoid";
import { findLayoutAt, calculatePhysicalLayout, FrameElement } from "../dataModels/frameTree";
import type { Film } from "../dataModels/film";
import { drawFilmStack } from "../tools/draw/drawFilmStack";
import type { Layout } from "../dataModels/frameTree";
import { Bubble, type BubbleRenderInfo } from "../dataModels/bubble";
import { makePlainCanvas } from "../tools/imageUtil";
import { renderBubbles, renderBubbleBackground, renderBubbleForeground } from "../tools/draw/renderBubble";
import { polygonToPath2D } from "../tools/draw/pathTools";
import { PaperOffset } from 'paperjs-offset'
// import * as Sentry from "@sentry/svelte";

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
      // not leaf
      for (let { layout } of backgrounds) {
        this.renderFrameBackground(ctx, layout, null);
      }
      // leaf
      foregrounds.sort((a, b) => a.layout.element.z - b.layout.element.z);
      for (let { layout, inheritanceContext } of foregrounds) {
        this.renderFrame(ctx, layout, inheritanceContext, embeddedBubbles);
      }
    }

    if (depth === 1) {
      renderBubbles(ctx, this.getPaperSize(), floatingBubbles, true, this.supportsDpr);
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
      bubble.renderInfo.unitedOuterPath = null;
      bubble.renderInfo.unitedInnerPath = null;
      bubble.renderInfo.unitedStrokePath = null;
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
      const opts = bubble.optionContext;
      const n_size = [bubble.n_p1[0] - bubble.n_p0[0], bubble.n_p1[1] - bubble.n_p0[1]];
      const ri = bubble.renderInfo!;
      const c = {
        paperSize: paperSize,
        shape: bubble.shape,
        size: n_size,
        optionContext: opts,
        rotation: bubble.rotation,
      }
      const json = JSON.stringify(c);
      // console.log(`${c} took ${performance.now() - startTime} ms, ${json.length} bytes`);
      if (ri.pathJson != json) {
        // 変更が起きたときのみ
        // const startTime = performance.now();
        ri.strokePath?.remove();
        ri.outerPath?.remove();
        ri.innerPath?.remove();
        ri.unitedStrokePath?.remove();
        ri.unitedOuterPath?.remove();
        ri.unitedInnerPath?.remove();
        ri.strokePath = null;
        ri.outerPath = null;
        ri.innerPath = null;
        ri.unitedStrokePath = null;
        ri.unitedOuterPath = null;
        ri.unitedInnerPath = null;

        const size = bubble.getPhysicalSize(paperSize);
        ri.pathJson = json;
        ri.strokePath = getPath(bubble.shape, size, opts, bubble.text);
        ri.strokePath?.rotate(-bubble.rotation);
        ri.innerPathIsSameWithOuterPath = false;
        if (ri.strokePath) { 
          const expansion = Math.min(ri.strokePath.bounds.width, ri.strokePath.bounds.height) * (opts.shapeExpand ?? 0);
          try {
            if (expansion == 0) {
              ri.outerPath = ri.strokePath.clone();
            } else {
              ri.outerPath = PaperOffset.offset(ri.strokePath as any, expansion);
            }
          }
          catch(e) {
            // sentryの報告がうまく解決できないので、PaperOffsetがうまく動かない場合はstrokePathをそのまま使う
            console.error("PaperOffset failed, using strokePath as outerPath", Bubble.decompile(bubble));
            ri.outerPath = ri.strokePath.clone();
            // Sentry.captureException(e, { extra: { bubble: Bubble.decompile(bubble) } });            
          }
          const shrinkage = Math.min(ri.outerPath.bounds.width, ri.outerPath.bounds.height) * (opts.shapeOutline ?? 0);
          try {
            if (shrinkage == 0) {
              ri.innerPath = ri.outerPath.clone();
              ri.innerPathIsSameWithOuterPath = true;
            } else {
              ri.innerPath = PaperOffset.offset(ri.outerPath as any, -shrinkage);
            }
          }
          catch(e) {
            // sentryの報告がうまく解決できないので、PaperOffsetがうまく動かない場合はouterPathをそのまま使う
            console.error("PaperOffset failed, using outerPath as innerPath", Bubble.decompile(bubble));
            ri.innerPath = ri.outerPath.clone();
            ri.innerPathIsSameWithOuterPath = true;
            // Sentry.captureException(e, { extra: { bubble: Bubble.decompile(bubble) } });            
          }
        }
        // console.log(`${json} took ${performance.now() - startTime} ms, ${json.length} bytes`);
      }
    }

    // 結合
    // strokePathがあるならouterPathもinnerPathもあるはず
    for (let bubble of bubbles) {
      const ri = bubble.renderInfo!;
      if (bubble.parent == null && ri.strokePath) {
        const center = bubble.getPhysicalCenter(paperSize);
        ri.unitedStrokePath?.remove();
        ri.unitedOuterPath?.remove();
        ri.unitedInnerPath?.remove();
        ri.unitedStrokePath = ri.strokePath.clone();
        ri.unitedOuterPath = ri.outerPath!.clone();
        ri.unitedInnerPath = ri.innerPath!.clone();
        ri.unitedOuterPath.translate(center);
        ri.unitedInnerPath.translate(center);
        ri.unitedStrokePath.translate(center);
        for (let child of ri.children) {
          const childCenter = child.getPhysicalCenter(paperSize);
          const ri2 = child.renderInfo!;
          if (ri2.strokePath == null) { continue; }

          const strokePath2 = ri2.strokePath!.clone();
          strokePath2?.translate(child.getPhysicalCenter(paperSize));
          ri.unitedStrokePath?.remove();
          ri.unitedStrokePath = ri.unitedStrokePath.unite(strokePath2!);

          const outerPath2 = ri2.outerPath!.clone();
          outerPath2.translate(childCenter);
          ri.unitedOuterPath?.remove();
          ri.unitedOuterPath = ri.unitedOuterPath.unite(outerPath2);

          const innerPath2 = ri2.innerPath!.clone();
          innerPath2.translate(childCenter);
          ri.unitedInnerPath?.remove();
          ri.unitedInnerPath = ri.unitedInnerPath.unite(innerPath2);
        }
        if (ri.children.length === 0 && ri.innerPathIsSameWithOuterPath) {
          ri.unitedInnerPath?.remove();
          ri.unitedInnerPath = ri.unitedOuterPath.clone();
        } else {
          ri.unitedOuterPath = ri.outerPath!.clone();
          ri.unitedOuterPath = ri.unitedOuterPath.subtract(ri.unitedInnerPath!);
        }
        ri.unitedOuterPath.rotate(bubble.rotation, center);
        ri.unitedOuterPath.translate(reverse2D(center));
        ri.unitedInnerPath!.rotate(bubble.rotation, center);
        ri.unitedInnerPath!.translate(reverse2D(center));
        ri.unitedStrokePath!.rotate(bubble.rotation, center);
        ri.unitedStrokePath!.translate(reverse2D(center));
      }
    }
  }

  makeFramePath(layout: Layout, offset: number): Path2D {
    const paperSize = this.getPaperSize();
    const clip = makeFrameClip(layout.corners, paperSize, {top: true, right: true, bottom: true, left: true}, offset);
    return polygonToPath2D(clip);
  }

  renderFrame(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext, embeddedBubbles: EmbeddedBubbles) {
    this.renderFrameBackground(ctx, layout, inheritanceContext);

    const element = layout.element;

    if (2 <= element.visibility) {
      this.renderFrameBorder(ctx, layout, inheritanceContext);
    }

    if (1 <= element.visibility) {
      this.renderFrameContent(ctx, layout, inheritanceContext, embeddedBubbles);
    }
  }

  renderFrameBackground(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext | null) {
    if (layout.element.visibility === 0) { return; }
    if (!layout.element.bgColor) { return; }

    const borderWidth = inheritanceContext?.borderWidth ?? 0;
    const framePath = this.makeFramePath(layout, -borderWidth * 0.5);

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.fillStyle = layout.element.bgColor;
    ctx.fill(framePath);
    ctx.restore();
  }

  // visibility 1
  renderFrameContent(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext, embeddedBubbles: EmbeddedBubbles) {
    const element = layout.element;
    if (0 < element.filmStack.films.length || embeddedBubbles.has(layout)) {
      const paperSize = this.getPaperSize();
      const element = layout.element;
  
      const [x0, y0, w, h] = trapezoidBoundingRect(layout.corners);
      const offset = -inheritanceContext.borderWidth * 0.5;

      const clip = (ctx: CanvasRenderingContext2D, film: Film) => {
        const clip = makeFrameClip(layout.corners, paperSize, film.barriers, offset);
        ctx.clip(polygonToPath2D(clip));
      }
      drawFilmStack(ctx, element.filmStack, paperSize, [x0 + w * 0.5, y0 + h * 0.5], clip);

      const framePath = this.makeFramePath(layout, -inheritanceContext.borderWidth * 0.5);
      const bubbles = embeddedBubbles.get(layout);
      if (bubbles) {
        ctx.save();
        ctx.clip(framePath);
        renderBubbles(ctx, this.getPaperSize(), bubbles, true, this.supportsDpr);
        ctx.restore();
      }
    }
  }

  renderFrameBorder(ctx: CanvasRenderingContext2D, layout: Layout, inheritanceContext: InheritanceContext) {
    const borderWidth = inheritanceContext.borderWidth;
    if (0 < borderWidth) {
      ctx.save();
      ctx.strokeStyle = inheritanceContext.borderColor;
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = "miter";
      const path = this.makeFramePath(layout, 0);
      ctx.stroke(path);
      ctx.restore();
    }
  }

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
      const { canvas: content, ctx } = makeCanvas();
      this.renderFrameBackground(ctx, layout, inheritanceContext);
      this.renderFrameContent(ctx, layout, inheritanceContext, embeddedBubbles);

      const { canvas: border, ctx: ctx2 } = makeCanvas();
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
      renderBubbleBackground(ctx, paperSize, bubble, true);
      renderBubbleForeground(ctx, paperSize, bubble, false, this.supportsDpr);
      bubbleCanvases[bubble.uuid] = canvas;
    }
    for (let bubble of bubbles) {
      if (bubble.parent == null) { continue; }
      const ctx = bubbleCanvases[bubble.parent].getContext('2d')!;
      renderBubbleForeground(ctx, this.getPaperSize(), bubble, true, this.supportsDpr);
    }

    return { frames: canvases, bubbles: Object.values(bubbleCanvases) };
  }

  resetCache(){
    for (let bubble of this.rawBubbles!) {
      bubble.renderInfo = undefined;
    }
  }
}