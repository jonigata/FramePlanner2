import { type Vector, multiply2D, ceil2D, scale2D, reciprocal2D } from "../geometry/geometry";
import { drawBubble as drawBubbleShape, drawPath, type DrawMethod } from "./bubbleGraphic";
import { drawFilmStack } from "./drawFilmStack";
import { drawText, measureText, type Direction } from "./drawText";
import type { Bubble } from "../../dataModels/bubble";


/**
 * バブルの描画処理をまとめたユーティリティ
 */

export function renderBubbles(ctx: CanvasRenderingContext2D, paperSize: Vector, bubbles: Bubble[], minimumSizeWarning: boolean) {
  for (let bubble of bubbles) {
    renderBubbleBackground(ctx, paperSize, bubble, minimumSizeWarning);
    renderBubbleForeground(ctx, paperSize, bubble, false);
  }
  for (let bubble of bubbles) {
    renderBubbleForeground(ctx, paperSize, bubble, true);
  }
}

export function renderBubbleBackground(ctx: CanvasRenderingContext2D, paperSize: Vector, bubble: Bubble, minimumSizeWarning: boolean) {
  if (bubble.parent) { return; }

  const size = bubble.getPhysicalSize(paperSize);
  const strokeWidth = bubble.getPhysicalStrokeWidth(paperSize);

  ctx.save();
  ctx.translate(...bubble.getPhysicalCenter(paperSize));
  ctx.rotate((-bubble.rotation * Math.PI) / 180);

  // fill/stroke設定
  if (minimumSizeWarning) {
    ctx.fillStyle = bubble.hasEnoughSize(paperSize) ? bubble.fillColor : "rgba(255, 128, 0, 0.9)";;
  } else {
    ctx.fillStyle = bubble.fillColor;
  }
  ctx.strokeStyle = 0 < strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
  ctx.lineWidth = strokeWidth;
  
  // shape背景描画
  drawBubbleElement(ctx, paperSize, bubble, size, 'fill');
  drawBubbleElement(ctx, paperSize, bubble, size, 'clip');

  // 画像描画
  drawFilmStack(ctx, bubble.filmStack, paperSize);

  ctx.restore();
}

export function renderBubbleForeground(ctx: CanvasRenderingContext2D, paperSize: Vector, bubble: Bubble, drawsUnited: boolean) {
  if (bubble.parent) {
    if (!drawsUnited) { return; }
  } else {
    if (drawsUnited) { return; }
  }

  const size = bubble.getPhysicalSize(paperSize);
  const center = bubble.getPhysicalCenter(paperSize);
  const strokeWidth = bubble.getPhysicalStrokeWidth(paperSize);

  ctx.save();
  ctx.translate(...center);
  ctx.rotate((-bubble.rotation * Math.PI) / 180);

  ctx.save();
  drawBubbleElement(ctx, paperSize, bubble, size, 'clip');

  // テキスト描画
  if (bubble.text && !bubble.hidesText) {
    drawBubbleText(ctx, paperSize, bubble, true);
  }
  ctx.restore();

  // shape枠描画
  ctx.strokeStyle = 0 < strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
  ctx.lineWidth = strokeWidth;
  drawBubbleElement(ctx, paperSize, bubble, size, 'stroke');

  ctx.restore();
}

function drawBubbleElement(ctx: CanvasRenderingContext2D, paperSize: Vector, bubble: Bubble, size: Vector, method: DrawMethod) {
  const ri = bubble.renderInfo!;
  if (ri.unitedPath) {
    drawPath(ctx, method, ri.unitedPath, bubble.optionContext);
  } else if (!bubble.parent) {
    if (ri.path) {
      drawPath(ctx, method, ri.path, bubble.optionContext);
    } else {
      drawBubbleShape(ctx, method, bubble.text, size, bubble.shape, bubble.optionContext);
    }
  }
}

function drawBubbleText(targetCtx: CanvasRenderingContext2D, paperSize: Vector, bubble: Bubble, supportsDpr: boolean = true) {
  const transform = targetCtx.getTransform();
  const dpr = supportsDpr ? (window.devicePixelRatio ?? 1) : 1;
  const viewScale: Vector = [transform.a * dpr, transform.d * dpr];

  const size = bubble.getPhysicalSize(paperSize);
  const fontSize = bubble.getPhysicalFontSize(paperSize);
  const offset = bubble.getPhysicalOffset(paperSize);
  const outlineWidth = bubble.getPhysicalOutlineWidth(paperSize);

  const [w, h] = ceil2D(multiply2D(size, viewScale));
  if (w < 1 || h < 1) { return; }

  const ri = bubble.renderInfo!;
  const ss = `${bubble.fontStyle} ${bubble.fontWeight} ${fontSize}px '${bubble.fontFamily}'`;

  const c = {
    viewScale: ceil2D(scale2D(viewScale, 1000)),
    size: size,
    offset: offset,
    fontStyle: bubble.fontStyle,
    fontWeight: bubble.fontWeight,
    fontSize: fontSize,
    lineSkip: bubble.lineSkip,
    charSkip: bubble.charSkip,
    fontFamily: bubble.fontFamily,
    text: bubble.text,
    direction: bubble.direction,
    autoNewline: bubble.autoNewline,
    fontColor: bubble.fontColor,
    outlineWidh: outlineWidth,
    outlineColor: bubble.outlineColor,
    fontRenderVersion: bubble.fontRenderVersion,
    fontCheck: document.fonts.check(ss),
  };
  const json = JSON.stringify(c);
  
  if (ri.textJson != json) {
    // 変更が起きたときのみ
    ri.textJson = json;

    ri.textCanvas = document.createElement('canvas');
    ri.textCtx = ri.textCanvas.getContext('2d')!;

    const canvas = ri.textCanvas;
    const ctx = ri.textCtx;

    canvas.width = w;
    canvas.height = h;

    ctx.translate(w * 0.5, h * 0.5);

    ctx.scale(...viewScale);
    ctx.translate(...offset);

    ctx.font = ss; // horizontal measureより先にないとだめ
    //const text = `${bubble.text}:${bubble.pageNumber}`;
    let text = bubble.text;
    if (!document.fonts.check(`${bubble.fontStyle} ${bubble.fontWeight} 20px '${bubble.fontFamily}'`)) {
      // どうもcheckが信用ならないので以下のコードは潰す
      // text = "ロード中……";
    }

    const baselineSkip = fontSize * 1.5 * (1.0 + bubble.lineSkip);
    const charSkip = fontSize * (1.0 + bubble.charSkip);
    const rubySize = bubble.rubySize;
    const rubyDistance = bubble.rubyDistance;
    const m = measureText(bubble.direction as Direction, ctx, size[0] * 0.85, size[1] * 0.85, text, baselineSkip, charSkip, bubble.autoNewline);
    const [tw, th] = [m.width, m.height];
    const r = { x: - tw * 0.5, y: - th * 0.5, width: tw, height: th };

    // 本体
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bubble.fontColor;
    drawText(bubble.direction as Direction, ctx, 'fill', r, text, baselineSkip, charSkip, rubySize, rubyDistance, m, bubble.autoNewline);

    // フチ
    if (0 < outlineWidth) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.strokeStyle = bubble.outlineColor;
      ctx.lineWidth = outlineWidth;
      ctx.font = ss;
      ctx.lineJoin = 'round';
      drawText(bubble.direction as Direction, ctx, 'stroke', r, text, baselineSkip, charSkip, rubySize, rubyDistance, m, bubble.autoNewline);
    }
  }

  // 描き戻し
  const canvas = ri.textCanvas;
  try {
    const rotation = Math.round(bubble.rotation * 10) / 10;

    targetCtx.save();
    if (rotation === 0 || rotation === 90 || rotation === 180 || rotation === 270) {
      targetCtx.imageSmoothingEnabled = false;
    }
    targetCtx.scale(...reciprocal2D(viewScale));
    targetCtx.drawImage(canvas, 0 - w * 0.5, 0 - h * 0.5);
    targetCtx.restore();
  }
  catch (e) {
    console.log(w, h, canvas.width, canvas.height, size);
    throw e;
  }
}