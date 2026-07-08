import { get } from 'svelte/store';
import { mainBookFileSystem } from '../filemanager/fileManagerStore';
import { text2Image, pollMediaStatus } from '../supabase';
import { toastStore } from '@skeletonlabs/skeleton';
import type { Page, NotebookLocal } from '../lib/book/book';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import { findClosestSize, calculateAspectPreservingSize, type SizePair } from '../lib/layeredCanvas/tools/imageUtil';
import { type Layout, collectLeaves, calculatePhysicalLayout, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { bookOperators, mainBook, redrawToken } from '../bookeditor/workspaceStore'
import { updateToken } from "../utils/accountStore";
import type { TextToImageRequest, ImagingBackground, ImagingModel, ImagingProvider, TextToImageOption } from './edgeFunctions/types/imagingTypes';
import { saveRequest } from '../filemanager/warehouse';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { _ } from 'svelte-i18n';
import { isHandledHttpError } from './edgeFunctions/edgeFunctions';
// import { captureConsoleIntegration } from '@sentry/svelte';
import { calculateImagingCost } from './edgeFunctions/calculateCost';
import { filmProcessorQueue } from './filmprocessor/filmProcessorStore';

export type ImagingContext = {
  awakeWarningToken: boolean;
  errorToken: boolean;
  total: number;
  succeeded: number;
  failed: number;
  refImages: Record<string, HTMLCanvasElement>;
  // 最大参照画像枚数（これを超える場合は切り詰める）
  maxRefImages: number;
  // autoSizeの短辺基準サイズ（デフォルト1024）
  autoSizeBase: number;
}

export function isContentsPolicyViolationError(error: any): boolean {
  if (error instanceof FunctionsHttpError) {
    return error.context.status === 422;
  }
  return false;
}

// Notebook から登場人物ポートレートの参照画像マップを生成
export function portraitsRecordFromNotebook(notebook: NotebookLocal | null): Record<string, HTMLCanvasElement> {
  const portraitsRecord: Record<string, HTMLCanvasElement> = {};
  (notebook?.characters ?? []).forEach((c) => {
    const p = c.portrait;
    if (p instanceof ImageMedia) {
      const canvas = p.drawSource as HTMLCanvasElement;
      // ULID キー
      portraitsRecord[c.ulid] = canvas;
      // 名前キー（前後空白除去・小文字化）
      const nameKey = (c.name ?? '').trim().toLowerCase();
      if (nameKey) portraitsRecord[nameKey] = canvas;
    }
  });
  return portraitsRecord;
}

// プロンプトから [ref:...] キーを抽出（出現順、重複排除）
export function extractRefKeysFromPrompt(prompt: string): string[] {
  const refTagRegex = /\[ref:([^\]]+)\]/g;
  const refKeys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = refTagRegex.exec(prompt)) !== null) {
    const key = m[1].trim();
    if (key && !refKeys.includes(key)) refKeys.push(key);
  }
  return refKeys;
}

// 参照画像辞書と上限、必要に応じてフォールバック用キャンバスを使って DataURL 配列を構築
export function buildImageDataUrlsForPrompt(
  prompt: string,
  refImages: Record<string, HTMLCanvasElement>,
  maxRefs: number,
  fallbackCanvases?: HTMLCanvasElement[]
): string[] {
  const limit = Math.max(0, maxRefs ?? 0);
  if (limit === 0) return [];
  const urls: string[] = [];
  const refKeys = extractRefKeysFromPrompt(prompt);
  for (const key of refKeys) {
    if (urls.length >= limit) break;
    const canvas = refImages[key] ?? refImages[key.trim().toLowerCase()];
    if (canvas) urls.push(canvas.toDataURL('image/png'));
  }
  if (urls.length < limit && fallbackCanvases?.length) {
    const remain = limit - urls.length;
    for (const c of fallbackCanvases.slice(0, remain)) {
      urls.push(c.toDataURL('image/png'));
    }
  }
  return urls;
}

export function inferProvider(m: ImagingModel): ImagingProvider {
  if (m.startsWith('gpt-image-1/')) return 'gpt-image-1';
  if (m.startsWith('gpt-image-1.5/')) return 'gpt-image-1.5';
  if (m.startsWith('gpt-image-2/')) return 'gpt-image-2';
  if (m.startsWith('qwen-image')) return 'qwen';
  if (m.startsWith('seedream/')) return 'seedream';
  return 'flux';
}

async function submitImagingRequest(req: TextToImageRequest): Promise<HTMLCanvasElement[]> {
  try {
    console.log("[DEBUG submitImagingRequest] Starting request, mode:", req.model);
    const { requestId, model } = await text2Image(req);
    console.log("[DEBUG submitImagingRequest] Got requestId:", requestId, "model:", model);
    await saveRequest(get(mainBookFileSystem)!, 'image', "texttoimage", requestId, model);

    const perf = performance.now();
    const { mediaResources } = await pollMediaStatus({ mediaType: 'image', action: "texttoimage", requestId, model });
    console.log('[DEBUG submitImagingRequest] Completed in', (performance.now() - perf) / 1000.0, 'seconds, canvases:', mediaResources.length);
    return mediaResources as HTMLCanvasElement[];
  } catch (error: any) {
    console.error("[DEBUG submitImagingRequest] Error:", error);
    // 402（残高不足）や422（コンテンツポリシー違反）はコードの問題ではないので再スローしない
    if (isHandledHttpError(error)) {
      // 402は既にedgeFunctions.tsでトースト表示済み
      return [];
    }
    if (isContentsPolicyViolationError(error)) {
      toastStore.trigger({ message: get(_)('generator.contentPolicyViolation'), timeout: 5000});
      return [];
    }
    // その他のエラーはトースト表示して再スロー
    toastStore.trigger({ message: `${get(_)('generator.imageGenerationError')}${error.context?.statusText ?? error?.message}`, timeout: 3000});
    throw error;
  }
}

// 旧個別実装は廃止し、単一の submitImagingRequest に統合

export async function generateImage(
  prompt: string,
  image_size: {width: number, height: number},
  model: ImagingModel,
  num_images: number,
  background: ImagingBackground,
  imageDataUrls: string[],
  option: TextToImageOption = { kind: 'none' },
): Promise<HTMLCanvasElement[]> {
  const req: TextToImageRequest = {
    provider: inferProvider(model),
    prompt,
    imageSize: image_size,
    numImages: num_images,
    model,
    background,
    imageDataUrls,
    option,
  };
  return submitImagingRequest(req);
}

/**
 * インライン画像生成 - リクエスト情報を埋め込んだFilmを返す（API呼び出しなし）
 * 実際のAPI呼び出しはfilmProcessorQueueで行われる
 * @param fitParams メディアロード後にフィッティングするためのパラメータ（オプション）
 */
export function generateImageInline(
  prompt: string,
  image_size: {width: number, height: number},
  model: ImagingModel,
  background: ImagingBackground,
  imageDataUrls: string[],
  option: TextToImageOption,
  fitParams?: { frameSize: Vector; paperSize: Vector }
): Film {
  const request: TextToImageRequest = {
    provider: inferProvider(model),
    prompt,
    imageSize: image_size,
    numImages: 1,
    model,
    background,
    imageDataUrls,
    option,
  };

  console.log("[generateImageInline] Creating beforeRequest media, mode:", request.model, "fitParams:", fitParams);

  // beforeRequest形式でImageMediaを作成（API呼び出しなし）
  const newMedia = new ImageMedia({
    mediaType: 'image',
    mode: 'beforeRequest',
    action: 'texttoimage',
    request,
    fitParams
  });
  const newFilm = Film.fromMedia(newMedia);

  // filmProcessorQueueに登録（ここでAPIが呼ばれ、ポーリングされる）
  filmProcessorQueue.publish({ film: newFilm });

  return newFilm;
}

export async function generateMarkedPageImages(imagingContext: ImagingContext, postfix: string, model: ImagingModel, onProgress: (progress: number) => void) {
  console.log("[DEBUG generateMarkedPageImages] Starting");
  const marks = get(bookOperators)!.getMarks();
  const newPages = get(mainBook)!.pages.filter((p, i) => marks[i]);
  console.log("[DEBUG generateMarkedPageImages] Marked pages:", newPages.length);
  if (newPages.length == 0) {
    console.log("no marks");
    toastStore.trigger({ message: `マークされたページが存在しません`, timeout: 3000});
    return;
  }

  let sum = 0;
  for (let i = 0; i < newPages.length; i++) {
    const page = newPages[i];
    const leaves = collectLeaves(page.frameTree);
    sum += leaves.length;
  }
  console.log("[DEBUG generateMarkedPageImages] Total frames to generate:", sum);

  let progress = 0;
  function onProgress2() {
    progress++;
    console.log(`[DEBUG generateMarkedPageImages] Progress: ${progress}/${sum}`);
    onProgress(progress / sum);
  }

  for (let i = 0; i < newPages.length; i++) {
    const page = newPages[i];
    console.log(`[DEBUG generateMarkedPageImages] Processing page ${i + 1}/${newPages.length}`);
    imagingContext.total = 1;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
    onProgress(progress / sum);
    await generatePageImages(imagingContext, postfix, model, page, false, onProgress2);
    console.log(`[DEBUG generateMarkedPageImages] Page ${i + 1} done. succeeded:`, imagingContext.succeeded, "failed:", imagingContext.failed);
  }
  console.log("[DEBUG generateMarkedPageImages] All pages done. Final progress:", progress, "/", sum);
}

export async function generatePageImages(imagingContext: ImagingContext, postfix: string, model: ImagingModel, page: Page, skipFilledFrame: boolean, onProgress: () => void) {
  imagingContext.awakeWarningToken = true;
  imagingContext.errorToken = true;
  const leaves = collectLeaves(page.frameTree);
  const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  const promises: Promise<void>[] = [];
  for (const leaf of leaves) {
    if (skipFilledFrame && leaf.filmStack.films.length > 0) {continue;}
    promises.push(
      (async (): Promise<void> => {
        // フィッティングはメディアロード後にfilmProcessorStoreで行われる
        await generateFrameImage(imagingContext, postfix, model, findLayoutOf(pageLayout, leaf)!, page.paperSize);
        onProgress();
      })());
  }
  imagingContext.total = promises.length;
  imagingContext.succeeded = 0;
  imagingContext.failed = 0;
  await Promise.all(promises);

  updateToken.set(true);
}


async function generateFrameImage(imagingContext: ImagingContext, postfix: string, model: ImagingModel, leafLayout: Layout, paperSize: Vector) {
  const frameId = Math.random().toString(36).substring(7);
  console.log(`[DEBUG generateFrameImage ${frameId}] Starting (inline mode)`);
  try {
    const frame = leafLayout.element;
    const composedPrompt = `${postfix}\n${frame.prompt}`;
    const imageDataUrls = buildImageDataUrlsForPrompt(
      composedPrompt,
      imagingContext.refImages,
      imagingContext.maxRefImages
    );

    // コマのサイズに基づいて画像生成サイズを決定
    const [frameWidth, frameHeight] = leafLayout.size;
    const targetSize: SizePair = { width: frameWidth, height: frameHeight };
    const supportedSizes = getSupportedSizesForMode(model);
    const base = imagingContext.autoSizeBase ?? 1024;
    const imageSize = supportedSizes && supportedSizes.length > 0
      ? findClosestSize(targetSize, [...supportedSizes], 0.7)
      : calculateAspectPreservingSize(targetSize, base, 64, Math.round(base * 2), Math.round(base * 0.5));

    // fitParams: メディアロード後にフィッティングするためのパラメータ
    const fitParams = {
      frameSize: [frameWidth, frameHeight] as Vector,
      paperSize: paperSize
    };

    console.log(`[DEBUG generateFrameImage ${frameId}] Calling generateImageInline...`);
    // インライン方式: リクエスト情報を埋め込んだFilmを返す（API呼び出しはfilmProcessorQueueで行われる）
    // フィッティングはメディアロード後にfilmProcessorStoreで行われる
    const film = generateImageInline(composedPrompt, imageSize, model, 'opaque', imageDataUrls, { kind: 'none' }, fitParams);
    console.log(`[DEBUG generateFrameImage ${frameId}] Got film (beforeRequest), adding to filmStack`);

    frame.filmStack.films.push(film);
    console.log(`[DEBUG generateFrameImage ${frameId}] After push - films.length:`, frame.filmStack.films.length);

    console.log(`[DEBUG generateFrameImage ${frameId}] Calling redrawToken.set(true)`);
    redrawToken.set(true);

    imagingContext.succeeded++;
    console.log(`[DEBUG generateFrameImage ${frameId}] Request submitted! Total succeeded:`, imagingContext.succeeded);
  }
  catch(error) {
    console.error(`[DEBUG generateFrameImage ${frameId}] Error:`, error);
    imagingContext.failed++;
    throw error;
  }
}

// textEdit専用の分岐は廃止（generateFrameImage内で参照画像を自動添付）

export function calculateCost(size: {width:number,height:number}, model: ImagingModel, inputSizes: {width:number,height:number}[]): number {
  console.log("calculateCost", size, model);
  return calculateImagingCost(model, size, inputSizes);
}

/*
const gptTokens: Record<string, number> = {
  "low": 272,
  "medium": 1056,
  "high": 4160,
}
const gptoutputCostPerMegaTokens = 40.0;

function calculateGPTCost(mode: Mode): number {
  if (!(mode === "gpt-image-1/low" || mode === "gpt-image-1/medium" || mode === "gpt-image-1/high")) {
    return 0;
  }
  const tokens = gptTokens[mode.split("/")[1]];
  return tokens / 1000000 * gptoutputCostPerMegaTokens;
}
*/

/**
 * textedit: テキスト編集モードで選択可能か
 * refRange: 参照画像の許容枚数（min=必須枚数、max=最大枚数）
 *   - min=0: 生成モードで使用可能（参照画像なしでOK）
 *   - max>0: 編集モードで使用可能（参照画像を受け取れる）
 * timeFactor: 生成時間の推定係数（プログレスバー用、大きいほど遅い）
 */
export type ModeOption = { readonly value: ImagingModel; readonly name: string; readonly uiType: ImagingProvider; readonly textedit: boolean; readonly refRange: { readonly min: number; readonly max: number }; readonly timeFactor: number; readonly pageImaging: boolean; readonly supportedSizes?: readonly SizePair[]; readonly sizeRange?: { readonly min: number; readonly max: number } };

// 階層構造用の型定義（再帰的）
export type ModeTreeItem = ModeOption | ModeGroup;
export type ModeGroup = {
  readonly groupId: string;
  readonly groupName: string;
  readonly children: readonly ModeTreeItem[];
};

export function isModeGroup(item: ModeTreeItem): item is ModeGroup {
  return 'groupId' in item && 'children' in item;
}

// 階層化されたモードオプション
// pageImaging: ページ単位の出力に耐える性能があるかどうか（人間がテストして判断）
export const modeOptionsTree: readonly ModeTreeItem[] = [
  // Z Image
  { value: 'z-image', name: 'Z Image', uiType: 'flux', textedit: false, refRange: { min: 0, max: 0 }, timeFactor: 12, pageImaging: false },
  // Nano Banana
  { value: 'nano-banana-2', name: 'Nano Banana 2', uiType: 'flux', textedit: true, refRange: { min: 0, max: 14 }, timeFactor: 12, pageImaging: true },
  { value: 'nano-banana-pro', name: 'Nano Banana Pro', uiType: 'flux', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 12, pageImaging: true },
  { value: 'nano-banana-lite', name: 'Nano Banana Lite', uiType: 'flux', textedit: true, refRange: { min: 0, max: 14 }, timeFactor: 5, pageImaging: true },
  // Seedream
  { value: 'chrono-edit', name: 'Chrono Edit', uiType: 'seedream', textedit: true, refRange: { min: 1, max: 1 }, timeFactor: 12, pageImaging: false },
  { value: 'seedream/v5-pro', name: 'Seedream v5 Pro', uiType: 'seedream', textedit: true, refRange: { min: 0, max: 10 }, timeFactor: 12, pageImaging: true, sizeRange: { min: 1536, max: 2048 } },
  { value: 'seedream/v5-lite', name: 'Seedream v5 Lite', uiType: 'seedream', textedit: true, refRange: { min: 0, max: 10 }, timeFactor: 12, pageImaging: true, sizeRange: { min: 1536, max: 3072 } },
  { value: 'seedream/v4.5', name: 'Seedream v4.5', uiType: 'seedream', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 12, pageImaging: true, sizeRange: { min: 1920, max: 4096 } },
  // Kling
  { value: 'kling-image/o1', name: 'Kling Image O1', uiType: 'flux', textedit: true, refRange: { min: 1, max: 4 }, timeFactor: 12, pageImaging: false },
  // Ideogram（T2I専用）: 品質不十分のためUI封印（enum/バックエンドは維持）
  // { value: 'ideogram/v4/instant', name: 'Ideogram V4 Instant', uiType: 'flux', textedit: false, refRange: { min: 0, max: 0 }, timeFactor: 5, pageImaging: false, sizeRange: { min: 512, max: 2048 } },
  // { value: 'ideogram/v4/fast', name: 'Ideogram V4 Fast', uiType: 'flux', textedit: false, refRange: { min: 0, max: 0 }, timeFactor: 5, pageImaging: false, sizeRange: { min: 512, max: 2048 } },
  // Qwen
  // { value: 'qwen-image-2', name: 'Qwen Image 2', uiType: 'flux', textedit: true, refRange: { min: 0, max: 6 }, timeFactor: 12, pageImaging: true },
  // { value: 'qwen-image-2/pro', name: 'Qwen Image 2 Pro', uiType: 'flux', textedit: true, refRange: { min: 0, max: 6 }, timeFactor: 12, pageImaging: true },
  { value: 'qwen-image', name: 'Qwen Image', uiType: 'flux', textedit: false, refRange: { min: 0, max: 3 }, timeFactor: 12, pageImaging: false },
  { value: 'qwen-image-edit/multiple-angles', name: 'アングル編集', uiType: 'flux', textedit: false, refRange: { min: 1, max: 1 }, timeFactor: 12, pageImaging: false },
  // FLUX グループ
  {
    groupId: 'flux',
    groupName: 'FLUX',
    children: [
      { value: 'schnell', name: 'Schnell', uiType: 'flux', textedit: false, refRange: { min: 0, max: 0 }, timeFactor: 5, pageImaging: false },
      { value: 'pro', name: 'Pro', uiType: 'flux', textedit: false, refRange: { min: 0, max: 0 }, timeFactor: 12, pageImaging: false },
      { value: 'chibi', name: 'ちび', uiType: 'flux', textedit: false, refRange: { min: 0, max: 1 }, timeFactor: 12, pageImaging: false },
      { value: 'manga', name: 'まんが', uiType: 'flux', textedit: false, refRange: { min: 0, max: 1 }, timeFactor: 12, pageImaging: false },
      { value: 'comibg', name: 'シンプル背景', uiType: 'flux', textedit: false, refRange: { min: 0, max: 1 }, timeFactor: 12, pageImaging: false },
      { value: 'flux-2-dev', name: 'Flux 2 Dev', uiType: 'flux', textedit: true, refRange: { min: 0, max: 14 }, timeFactor: 12, pageImaging: false },
      { value: 'flux-2-pro', name: 'Flux 2 Pro', uiType: 'flux', textedit: true, refRange: { min: 0, max: 14 }, timeFactor: 12, pageImaging: false },
      { value: 'flux-2-flex', name: 'Flux 2 Flex', uiType: 'flux', textedit: true, refRange: { min: 0, max: 14 }, timeFactor: 12, pageImaging: false },
      { value: 'flux-2-klein', name: 'Flux 2 Klein', uiType: 'flux', textedit: true, refRange: { min: 0, max: 14 }, timeFactor: 5, pageImaging: true },
      { value: 'kontext/pro', name: 'Kontext [Pro]', uiType: 'flux', textedit: true, refRange: { min: 1, max: 1 }, timeFactor: 12, pageImaging: false },
      { value: 'kontext/max', name: 'Kontext [Max]', uiType: 'flux', textedit: true, refRange: { min: 1, max: 1 }, timeFactor: 12, pageImaging: false },
      { value: 'kontext/inscene', name: 'Kontext [InScene]', uiType: 'flux', textedit: true, refRange: { min: 1, max: 1 }, timeFactor: 12, pageImaging: false },
    ] as const,
  },
  // GPT-image-2 グループ
  {
    groupId: 'gpt-image-2',
    groupName: 'gpt-image-2',
    children: [
      { value: 'gpt-image-2/low', name: 'gpt-image-2 Low', uiType: 'gpt-image-2', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 15, pageImaging: true, sizeRange: { min: 1024, max: 3840 } },
      { value: 'gpt-image-2/medium', name: 'gpt-image-2 Medium', uiType: 'gpt-image-2', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 22, pageImaging: true, sizeRange: { min: 1024, max: 3840 } },
      { value: 'gpt-image-2/high', name: 'gpt-image-2 High', uiType: 'gpt-image-2', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 40, pageImaging: true, sizeRange: { min: 1024, max: 3840 } },
    ] as const,
  },
  // GPT-image-1.5 グループ
  {
    groupId: 'gpt-image-1.5',
    groupName: 'gpt-image-1.5',
    children: [
      { value: 'gpt-image-1.5/low', name: 'gpt-image-1.5 Low', uiType: 'gpt-image-1.5', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 15, pageImaging: true, supportedSizes: [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }, { width: 1024, height: 1536 }] },
      { value: 'gpt-image-1.5/medium', name: 'gpt-image-1.5 Medium', uiType: 'gpt-image-1.5', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 22, pageImaging: true, supportedSizes: [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }, { width: 1024, height: 1536 }] },
      { value: 'gpt-image-1.5/high', name: 'gpt-image-1.5 High', uiType: 'gpt-image-1.5', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 40, pageImaging: true, supportedSizes: [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }, { width: 1024, height: 1536 }] },
    ] as const,
  },
  // レガシーグループ
  {
    groupId: 'legacy',
    groupName: 'レガシー',
    children: [
      // GPT-image-1 サブグループ
      {
        groupId: 'gpt-image-1',
        groupName: 'gpt-image-1',
        children: [
          { value: 'gpt-image-1/low', name: 'gpt-image-1 Low', uiType: 'gpt-image-1', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 30, pageImaging: false, supportedSizes: [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }, { width: 1024, height: 1536 }] },
          { value: 'gpt-image-1/medium', name: 'gpt-image-1 Medium', uiType: 'gpt-image-1', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 30, pageImaging: false, supportedSizes: [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }, { width: 1024, height: 1536 }] },
          { value: 'gpt-image-1/high', name: 'gpt-image-1 High', uiType: 'gpt-image-1', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 30, pageImaging: false, supportedSizes: [{ width: 1024, height: 1024 }, { width: 1536, height: 1024 }, { width: 1024, height: 1536 }] },
        ] as const,
      },
      { value: 'nano-banana', name: 'Nano Banana', uiType: 'flux', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 12, pageImaging: false },
      { value: 'seedream/v4', name: 'Seedream v4', uiType: 'seedream', textedit: true, refRange: { min: 0, max: 4 }, timeFactor: 12, pageImaging: false, sizeRange: { min: 1024, max: 4096 } },
    ],
  },
] as const;

// フラット化されたモードオプション（後方互換性のため、再帰対応）
function flattenModeOptions(tree: readonly ModeTreeItem[]): ModeOption[] {
  const result: ModeOption[] = [];
  for (const item of tree) {
    if (isModeGroup(item)) {
      result.push(...flattenModeOptions(item.children));
    } else {
      result.push(item);
    }
  }
  return result;
}

export const modeOptions: readonly ModeOption[] = flattenModeOptions(modeOptionsTree);

// 型安全チェック: modeOptions が全 ImagingMode をカバーしているか
type CoveredModes = typeof modeOptions[number]['value'];
type MissingModes = Exclude<ImagingModel, CoveredModes>;
type ExtraModes = Exclude<CoveredModes, ImagingModel>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _checkMissingModes: MissingModes extends never ? true : { error: 'modeOptions に不足している ImagingMode があります'; missing: MissingModes } = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _checkExtraModes: ExtraModes extends never ? true : { error: 'modeOptions に ImagingMode にない値があります'; extra: ExtraModes } = true;

// ModeChoice は廃止（すべて ImagingMode で扱う）

// 参照画像対応ヘルパ
export function getRefRangeForMode(model: ImagingModel): { min: number; max: number } {
  const found = modeOptions.find(o => o.value === model)?.refRange;
  return found ?? { min: 0, max: 0 };
}

export function getRefMaxForMode(model: ImagingModel): number {
  return Math.max(0, getRefRangeForMode(model).max);
}

export function supportsRefImages(model: ImagingModel): boolean {
  return getRefRangeForMode(model).max > 0;
}

export function getTimeFactorForMode(model: ImagingModel): number {
  return modeOptions.find(o => o.value === model)?.timeFactor ?? 12;
}

export function getSupportedSizesForMode(model: ImagingModel): readonly SizePair[] | null {
  return modeOptions.find(o => o.value === model)?.supportedSizes ?? null;
}

export function getSizeRangeForMode(model: ImagingModel): { min: number; max: number } {
  return modeOptions.find(o => o.value === model)?.sizeRange ?? { min: 512, max: 1536 };
}

/**
 * 指定モードの対応サイズから最も近いサイズを選択する
 * 対応サイズが定義されていない場合は元のサイズをそのまま返す
 * @param targetSize 目標サイズ
 * @param mode イメージングモード
 * @param aspectWeight アスペクト比の重み（デフォルト0.7）
 * @returns 最も近いサイズ
 */
export function selectClosestSupportedSize(
  targetSize: SizePair,
  model: ImagingModel,
  aspectWeight: number
): SizePair {
  const supportedSizes = getSupportedSizesForMode(model);
  if (!supportedSizes || supportedSizes.length === 0) {
    return targetSize;
  }
  return findClosestSize(targetSize, [...supportedSizes], aspectWeight);
}
