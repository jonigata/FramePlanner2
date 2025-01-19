import { get } from 'svelte/store';
import { fileSystem } from '../filemanager/fileManagerStore';
import { text2Image, pollMediaStatus } from '../supabase';
import { toastStore } from '@skeletonlabs/skeleton';
import type { Page } from '../lib/book/book';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { createCanvasFromImage } from '../lib/layeredCanvas/tools/imageUtil';
import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
import { bookEditor, mainBook, redrawToken } from '../bookeditor/bookStore'
import { updateToken } from "../utils/accountStore";
import type { TextToImageRequest } from './edgeFunctions/types/imagingTypes';
import { saveRequest } from '../filemanager/warehouse';

export type ImagingContext = {
  awakeWarningToken: boolean;
  errorToken: boolean;
  total: number;
  succeeded: number;
  failed: number;
}

export type Mode = "schnell" | "pro" | "chibi" | "manga";

export async function generateFluxImage(prompt: string, image_size: {width: number, height: number}, mode: Mode, num_images: number, context: ImagingContext): Promise<HTMLCanvasElement[]> {
  console.log("running feathral");
  try {
    let imageRequest: TextToImageRequest = {
      prompt, 
      image_size,
      num_images,
      mode, 
    };
    console.log(imageRequest);
    const { request_id } = await text2Image(imageRequest);

    await saveRequest(get(fileSystem)!, "image", mode, request_id);
    // return [];

    const perf = performance.now();
    const { mediaResources } = await pollMediaStatus("image", mode, request_id);

    console.log("generateImageFromTextWithFlux", performance.now() - perf);

    return mediaResources as HTMLCanvasElement[];
  }
  catch(error) {
    console.log(error);
    toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    return [];
  }
}

export async function generateMarkedPageImages(imagingContext: ImagingContext, postfix: string, mode: Mode, onProgress: (progress: number) => void) {
  const marks = get(bookEditor)!.getMarks();
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
    await generatePageImages(imagingContext, postfix, mode, page, onProgress2);
  }
}

export async function generatePageImages(imagingContext: ImagingContext, postfix: string, mode: Mode, page: Page, onProgress: () => void) {
  imagingContext.awakeWarningToken = true;
  imagingContext.errorToken = true;
  const leaves = collectLeaves(page.frameTree);
  const promises: Promise<void>[] = [];
  for (const leaf of leaves) {
    promises.push(
      (async (): Promise<void> => {
        await generateFrameImage(imagingContext, postfix, mode, leaf);
        onProgress();
      })());
  }
  imagingContext.total = promises.length;
  imagingContext.succeeded = 0;
  imagingContext.failed = 0;
  await Promise.all(promises);

  const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  for (const leaf of leaves) {
    const leafLayout = findLayoutOf(pageLayout, leaf);
    const transformer = new FilmStackTransformer(page.paperSize, leaf.filmStack.films);
    transformer.scale(0.01);
    console.log("scaled");
    constraintLeaf(page.paperSize, leafLayout!);
  }
  updateToken.set(true);
}


async function generateFrameImage(imagingContext: ImagingContext, postfix: string, mode: Mode, frame: FrameElement) {
  console.log("postfix", postfix);
  const images = await generateFluxImage(`${postfix}\n${frame.prompt}`, {width:1024,height:1024}, mode, 1, imagingContext);
  if (0 < images.length) {
    const media = new ImageMedia(images[0]);
    const film = new Film(media);
    frame.filmStack.films.push(film);
    frame.gallery.push(media.drawSourceCanvas);
    imagingContext.succeeded++;
    redrawToken.set(true);
  } else {
    imagingContext.failed++;
  }
}

export function calculateCost(size: {width:number,height:number}, mode: Mode): number {
  const pixels = size.width * size.height;
  const costs: Record<Mode, number> = {
    "schnell": 1,
    "pro": 8,
    "chibi": 7,
    "manga": 7,
  };
  let cost = costs[mode];
  cost = Math.ceil(cost * pixels / 1024 / 1024);
  return cost;
}

