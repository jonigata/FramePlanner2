import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { analyticsEvent } from "./analyticsEvent";
import { waitDialog } from './waitDialog';
import { requireSignIn } from './signInPrompt';
import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import type { Page } from '../lib/book/book';
import type { TextMaskResponse } from './edgeFunctions/types/imagingTypes.d';
import { calculatePhysicalLayout, findLayoutOf, FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
import { trapezoidBoundingRect } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import { loading } from './loadingStore';
import { textEraser, pollMediaStatus } from '../supabase';
import { saveRequest } from '../filemanager/warehouse';
import { mainBookFileSystem } from '../filemanager/fileManagerStore';
import { fitCanvasToRange, resizeCanvas } from '../lib/layeredCanvas/tools/imageUtil';

export type TextLiftSelection = {
  id: number;
  enabled: boolean;
  text?: string;
  box: { x0: number; y0: number; x1: number; y1: number };
  orientation: TextMaskResponse['boxes'][number]['orientation'];
  charHeight: number;
};

export type TextLiftDialogResult = {
  committed: boolean;
  selections: TextLiftSelection[];
  eraseFromSource: boolean;
};

export type TextLiftResult = (TextLiftDialogResult & { erasedFilm?: Film }) | null;

type MaskRect = { x: number; y: number; w: number; h: number };

export async function textLiftFilm(page: Page, film: Film, frame?: FrameElement): Promise<TextLiftResult> {
  if (!await requireSignIn('テキスト抽出はサインインしてないと使えません')) {
    return null;
  }

  if (film.content.kind !== 'media' || !(film.content.media instanceof ImageMedia)) {
    toastStore.trigger({ message: `テキスト抽出は画像のみ使えます`, timeout: 3000});
    return null;
  }
  const imageMedia = film.content.media as ImageMedia;
  const sourceCanvas = imageMedia.drawSource;

  const dialogResult = await waitDialog<TextLiftDialogResult | null>('textlift', { title: "テキスト抽出", imageSource: sourceCanvas });
  if (!dialogResult?.committed) {
    return null;
  }

  // チェックボックスがオンの場合は消しゴム処理も行う
  const shouldEraseSource = dialogResult.eraseFromSource ?? true;
  const maskRects = shouldEraseSource ? buildMaskRects(sourceCanvas, dialogResult.selections) : [];

  let erasedFilm: Film | undefined;
  if (maskRects.length) {
    loading.set(true);
    try {
      // textEraser APIは長辺が512以上1536以下である必要があるためリサイズ
      const originalWidth = sourceCanvas.width;
      const originalHeight = sourceCanvas.height;
      const resizedForApi = fitCanvasToRange(sourceCanvas, { min: 512, max: 1536 });
      const imageDataUrl = resizedForApi.toDataURL("image/png");
      // 全文字消去済み画像を取得
      const { requestId, model } = await textEraser({ imageDataUrl });
      await saveRequest(get(mainBookFileSystem)!, 'image', 'texteraser', requestId, model);
      const { mediaResources } = await pollMediaStatus({ mediaType: 'image', action: 'texteraser', requestId, model });
      const erasedCanvasFromApi = mediaResources[0] as HTMLCanvasElement;
      // 消去済み画像を元のサイズに戻す
      const fullyErasedCanvas = resizeCanvas(erasedCanvasFromApi, originalWidth, originalHeight);
      // 選択された領域だけ消去済み画像から元画像にコピーした合成画像を作成
      const compositeCanvas = compositeErasedRegions(sourceCanvas, fullyErasedCanvas, maskRects);
      erasedFilm = film.clone();
      erasedFilm.media = new ImageMedia(compositeCanvas);
    } catch (error) {
      console.error('textLift text-eraser failed', error);
      toastStore.trigger({ message: `文字消去に失敗しました`, timeout: 3000 });
    } finally {
      loading.set(false);
    }
  }

  // フキダシの配置
  const paperSize = page.paperSize;
  const enabledSelections = dialogResult.selections
    .filter(s => s.enabled)
    .map(sel => ({ ...sel, text: sel.text?.trim() ?? '' }))
    .filter(s => s.text.length > 0);

  enabledSelections.forEach((selection, idx) => {
    const bubble = new Bubble();
    bubble.text = selection.text;
    bubble.initOptions();
    bubble.direction = selection.orientation === 'vertical' ? 'v' : 'h';
    bubble.fillColor = 'rgba(255, 255, 255, 0)';
    bubble.shape = 'none';

    const frameLayout = frame ? locateFrameLayout(page, frame) : locateFrameLayoutByFilm(page, film);
    const placed = placeBubbleBySelection(bubble, selection, film, imageMedia, frameLayout, paperSize);
    if (!placed) {
      // フレームが特定できない場合は従来の適当配置にフォールバック
      const baseX = paperSize[0] / 2 + (idx % 3 - 1) * 120;
      const baseY = paperSize[1] / 2 + Math.floor(idx / 3) * 140;
      bubble.setPhysicalCenter(paperSize, [baseX, baseY]);
      const size = bubble.calculateFitSize(paperSize);
      bubble.setPhysicalSize(paperSize, size);
    }

    page.bubbles.push(bubble);
  });

  analyticsEvent('textlift');
  return { ...dialogResult, erasedFilm };
}

function buildMaskRects(sourceCanvas: HTMLCanvasElement, selections: TextLiftSelection[]): MaskRect[] {
  const enabled = selections.filter(sel => sel.enabled);
  if (!enabled.length) { return []; }

  const rects: MaskRect[] = [];
  const maskWidth = sourceCanvas.width;
  const maskHeight = sourceCanvas.height;

  for (const sel of enabled) {
    const rawWidth = Math.max(1, Math.abs(sel.box.x1 - sel.box.x0));
    const rawHeight = Math.max(1, Math.abs(sel.box.y1 - sel.box.y0));
    const expandWidth = rawWidth * 1.20;
    const expandHeight = rawHeight * 1.20;
    const centerX = (sel.box.x0 + sel.box.x1) * 0.5;
    const centerY = (sel.box.y0 + sel.box.y1) * 0.5;

    const x = Math.max(0, Math.floor(centerX - expandWidth * 0.5));
    const y = Math.max(0, Math.floor(centerY - expandHeight * 0.5));
    const w = Math.max(1, Math.min(maskWidth - x, Math.ceil(expandWidth)));
    const h = Math.max(1, Math.min(maskHeight - y, Math.ceil(expandHeight)));

    rects.push({ x, y, w, h });
  }

  return rects;
}

/**
 * 元画像の上に、指定領域だけ消去済み画像からコピーした合成画像を作成する
 */
function compositeErasedRegions(
  originalCanvas: HTMLCanvasElement,
  erasedCanvas: HTMLCanvasElement,
  maskRects: MaskRect[]
): HTMLCanvasElement {
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = originalCanvas.width;
  resultCanvas.height = originalCanvas.height;
  const ctx = resultCanvas.getContext('2d')!;

  // まず元画像を描画
  ctx.drawImage(originalCanvas, 0, 0);

  // 指定領域だけ消去済み画像からコピー
  for (const rect of maskRects) {
    ctx.drawImage(
      erasedCanvas,
      rect.x, rect.y, rect.w, rect.h,  // source
      rect.x, rect.y, rect.w, rect.h   // destination
    );
  }

  return resultCanvas;
}

function locateFrameLayout(page: Page, frame: FrameElement) {
  const layout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0, 0]);
  return findLayoutOf(layout, frame);
}

function locateFrameLayoutByFilm(page: Page, film: Film) {
  const frame = findFrameElementByFilm(page.frameTree, film);
  if (!frame) { return null; }
  return locateFrameLayout(page, frame);
}

function findFrameElementByFilm(root: FrameElement, film: Film): FrameElement | null {
  if (root.filmStack.films.includes(film)) {
    return root;
  }
  for (const child of root.children ?? []) {
    const found = findFrameElementByFilm(child, film);
    if (found) { return found; }
  }
  return null;
}

function placeBubbleBySelection(
  bubble: Bubble,
  selection: TextLiftSelection,
  film: Film,
  media: ImageMedia,
  frameLayout: ReturnType<typeof locateFrameLayout>,
  paperSize: Vector
): boolean {
  if (!frameLayout) { return false; }

  // reverse / rotation は無視する前提
  const [fx, fy, fw, fh] = trapezoidBoundingRect(frameLayout.corners);
  const frameCenter: Vector = [fx + fw * 0.5, fy + fh * 0.5];
  const imgW = media.naturalWidth;
  const imgH = media.naturalHeight;

  // Canvas描画と同じ行列: center → translation → rotation(無視) → scale → move to image origin
  const m = film.makeMatrix(paperSize);

  const toPage = (x: number, y: number): Vector => {
    // film.makeMatrix は画像中心原点（左右上下-0.5幅/高さ）前提なので平行移動してから適用
    const p = m.transformPoint({ x: x - imgW * 0.5, y: y - imgH * 0.5 });
    return [frameCenter[0] + p.x, frameCenter[1] + p.y];
  };

  const p0 = toPage(selection.box.x0, selection.box.y0);
  const p1 = toPage(selection.box.x1, selection.box.y1);
  const center: Vector = [
    (p0[0] + p1[0]) * 0.5,
    (p0[1] + p1[1]) * 0.5,
  ];
  console.log('placeBubbleBySelection', selection, p0, p1, center);

  // charHeightをページ座標系に変換（行列を使用して画像サイズも考慮）
  const originPoint = m.transformPoint({ x: 0, y: 0 });
  const heightPoint = m.transformPoint({ x: 0, y: selection.charHeight });
  let physicalCharHeight = Math.sqrt(
    Math.pow(heightPoint.x - originPoint.x, 2) +
    Math.pow(heightPoint.y - originPoint.y, 2)
  );
  console.log('physicalCharHeight:', physicalCharHeight);
  physicalCharHeight = Math.max(10, physicalCharHeight); // 最低限のサイズ補正
  console.log('physicalCharHeight:', physicalCharHeight);
  const physicalFontSize = physicalCharHeight * 1.0; // Cloud Vision矩形は文字にぴったりなので等倍
  bubble.setPhysicalFontSize(paperSize, physicalFontSize);
  bubble.setPhysicalCenter(paperSize, center);
  // OCR矩形のサイズをページ座標系で使用（calculateFitSizeはフォント依存で大きくなりすぎるため）
  const boxWidth = Math.abs(p1[0] - p0[0]);
  const boxHeight = Math.abs(p1[1] - p0[1]);
  bubble.setPhysicalSize(paperSize, Bubble.enoughSize([boxWidth, boxHeight]));
  return true;
}
