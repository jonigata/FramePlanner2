import { get } from 'svelte/store';
import { mainBookFileSystem } from '../filemanager/fileManagerStore';
import { text2Image, pollMediaStatus } from '../supabase';
import { toastStore } from '@skeletonlabs/skeleton';
import type { Page } from '../lib/book/book';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
import { type Layout, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
import { bookOperators, mainBook, redrawToken } from '../bookeditor/workspaceStore'
import { updateToken } from "../utils/accountStore";
import type { TextToImageRequest, ImagingBackground, ImagingMode, ImagingProvider } from './edgeFunctions/types/imagingTypes';
import { saveRequest } from '../filemanager/warehouse';
import { analyticsEvent } from "../utils/analyticsEvent";
import { FunctionsHttpError } from '@supabase/supabase-js'
import { captureConsoleIntegration } from '@sentry/svelte';

export type ImagingContext = {
  awakeWarningToken: boolean;
  errorToken: boolean;
  total: number;
  succeeded: number;
  failed: number;
}

export function isContentsPolicyViolationError(error: any): boolean {
  if (error instanceof FunctionsHttpError) {
    return error.context.status === 422;
  }
  return false;
}

async function generateImage_Flux(prompt: string, image_size: {width: number, height: number}, mode: ImagingMode, num_images: number): Promise<HTMLCanvasElement[]> {
  console.log("running feathral");
  try {
    let imageRequest: TextToImageRequest = {
      provider: "flux",
      prompt, 
      imageSize: image_size,
      numImages: num_images,
      mode, 
      background: "opaque", // 無意味
    };
    console.log(imageRequest);
    const { requestId } = await text2Image(imageRequest);

    await saveRequest(get(mainBookFileSystem)!, "image", mode, requestId);

    const perf = performance.now();
    const { mediaResources } = await pollMediaStatus({ mediaType: "image", mode, requestId });

    console.log("generateImage_Flux", performance.now() - perf);

    analyticsEvent('generate_flux');

    return mediaResources as HTMLCanvasElement[];
  }
  catch(error: any) {
    if (isContentsPolicyViolationError(error)) {
      toastStore.trigger({ message: `画像生成エラー: ジェネレータに拒否されました。<br/>おそらくコンテントポリシー違反です。`, timeout: 5000});
    } else {
      toastStore.trigger({ message: `画像生成エラー: ${error.context.statusText}`, timeout: 3000});
    }
    throw error;
  }
}

async function generateImage_Gpt1(prompt: string, image_size: {width: number, height: number}, mode: ImagingMode, num_images: number, background: ImagingBackground): Promise<HTMLCanvasElement[]> {
  console.log("running feathral");
  try {
    let imageRequest: TextToImageRequest = {
      provider: "gpt-image-1",
      prompt, 
      imageSize: image_size,
      numImages: num_images,
      mode, 
      background,
    };
    console.log(imageRequest);
    const { requestId } = await text2Image(imageRequest);

    await saveRequest(get(mainBookFileSystem)!, "image", mode, requestId);

    const perf = performance.now();
    const { mediaResources } = await pollMediaStatus({ mediaType: "image", mode, requestId });

    console.log("generateImage_Gpt1", performance.now() - perf);

    analyticsEvent('generate_gpt1');

    return mediaResources as HTMLCanvasElement[];
  }
  catch(error: any) {
    if (isContentsPolicyViolationError(error)) {
      toastStore.trigger({ message: `画像生成エラー: ジェネレータに拒否されました。<br/>おそらくコンテントポリシー違反です。`, timeout: 5000});
    } else {
      toastStore.trigger({ message: `画像生成エラー: ${error.context.statusText}`, timeout: 3000});
    }
    throw error;
  }
}

export async function generateImage(prompt: string, image_size: {width: number, height: number}, mode: ImagingMode, num_images: number, background: ImagingBackground): Promise<HTMLCanvasElement[]> {
  if (mode.startsWith("gpt-image-1")) {
    return generateImage_Gpt1(prompt, image_size, mode, num_images, background);
  } else {
    return generateImage_Flux(prompt, image_size, mode, num_images);
  }
}

export async function generateMarkedPageImages(imagingContext: ImagingContext, postfix: string, mode: ImagingMode, onProgress: (progress: number) => void) {
  const marks = get(bookOperators)!.getMarks();
  const newPages = get(mainBook)!.pages.filter((p, i) => marks[i]);
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

  let progress = 0;
  function onProgress2() {
    progress++;
    onProgress(progress / sum);
  }

  for (let i = 0; i < newPages.length; i++) {
    const page = newPages[i];
    imagingContext.total = 1;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
    onProgress(progress / sum);
    await generatePageImages(imagingContext, postfix, mode, page, false, onProgress2);
  }
}

export async function generatePageImages(imagingContext: ImagingContext, postfix: string, mode: ImagingMode, page: Page, skipFilledFrame: boolean, onProgress: () => void) {
  imagingContext.awakeWarningToken = true;
  imagingContext.errorToken = true;
  const leaves = collectLeaves(page.frameTree);
  const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  const promises: Promise<void>[] = [];
  for (const leaf of leaves) {
    if (skipFilledFrame && leaf.filmStack.films.length > 0) {continue;}
    promises.push(
      (async (): Promise<void> => {
        await generateFrameImage(imagingContext, postfix, mode, findLayoutOf(pageLayout, leaf)!, page.paperSize);
        const leafLayout = findLayoutOf(pageLayout, leaf);
        const transformer = new FilmStackTransformer(page.paperSize, leaf.filmStack.films);
        transformer.scale(0.01);
        console.log("scaled");
        constraintLeaf(page.paperSize, leafLayout!);
        onProgress();
      })());
  }
  imagingContext.total = promises.length;
  imagingContext.succeeded = 0;
  imagingContext.failed = 0;
  await Promise.all(promises);

  updateToken.set(true);
}


async function generateFrameImage(imagingContext: ImagingContext, postfix: string, mode: ImagingMode, leafLayout: Layout, paperSize: Vector) {
  try {
    const frame = leafLayout.element;
    const canvases = await generateImage(`${postfix}\n${frame.prompt}`, {width:1024,height:1024}, mode, 1, "opaque");

    const media = new ImageMedia(canvases[0]);
    const film = new Film(media);
    frame.filmStack.films.push(film);
    frame.gallery.push(media);

    const transformer = new FilmStackTransformer(paperSize, frame.filmStack.films);
    transformer.scale(0.01);
    console.log("scaled");
    constraintLeaf(paperSize, leafLayout);
    redrawToken.set(true);

    imagingContext.succeeded++;
  } 
  catch(error) {
    imagingContext.failed++;
    throw error;
  }
}

export function calculateCost(size: {width:number,height:number}, mode: ImagingMode): number {
  console.log("calculateCost", size, mode);
  const pixels = size.width * size.height;
  const costs: Record<ImagingMode, number> = {
    "schnell": 1,
    "pro": 8,
    "chibi": 7,
    "manga": 7,
    "comibg": 7,
    "gpt-image-1/low": 2,
    "gpt-image-1/medium": 7,
    "gpt-image-1/high": 30,
  };
  let cost = costs[mode];
  cost = Math.ceil(cost * pixels / 1024 / 1024);
  return cost;
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

export const modeOptions: Array<{value: ImagingMode, name: string, cost: number, uiType: ImagingProvider}> = [
  { value: 'gpt-image-1/low', name: 'GPT-image-1 low', cost: 2, uiType: "gpt-image-1" },
  { value: 'gpt-image-1/medium', name: 'GPT-image-1 medium', cost: 7, uiType: "gpt-image-1" },
  { value: 'gpt-image-1/high', name: 'GPT-image-1 high', cost: 30, uiType: "gpt-image-1" },
  { value: 'schnell', name: 'FLUX Schnell', cost: 1, uiType: "flux" },
  { value: 'pro', name: 'FLUX Pro', cost: 8, uiType: "flux" },
  { value: 'chibi', name: 'FLUX ちび', cost: 7, uiType: "flux" },
  { value: 'manga', name: 'FLUX まんが', cost: 7, uiType: "flux" },
  { value: 'comibg', name: 'シンプル背景', cost: 7, uiType: "flux" },
];
