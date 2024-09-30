import { get } from 'svelte/store';
import { generateImageFromTextWithFeathral, generateImageFromTextWithFlux } from '../firebase';
import { toastStore } from '@skeletonlabs/skeleton';
import type { Page } from '../bookeditor/book';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { createCanvasFromImage } from '../utils/imageUtil';
import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
import { bookEditor, mainBook, redrawToken } from '../bookeditor/bookStore'
import { updateToken } from "../utils/accountStore";

export type ImagingContext = {
  awakeWarningToken: boolean;
  errorToken: boolean;
  total: number;
  succeeded: number;
  failed: number;
}

export type ImagingResult = {
  images: HTMLImageElement[];
  feathral: number;
};

export type Mode = "schnell" | "pro" | "chibi" | "manga";

export async function generateImage(prompt: string, width: number, height: number, context: ImagingContext): Promise<ImagingResult> {
  console.log("running feathral");
  try {
    let q = null;
    if (context.awakeWarningToken) {
      q = setTimeout(() => {
        toastStore.trigger({ message: `サーバがスリープ状態だと、生成の初動が遅れたり\n失敗したりすることがあります`, timeout: 3000});
        q = null;
      }, 10000);
      context.awakeWarningToken = false;
    }
    let imageRequest = {
      "style": "anime",
      "prompt": prompt,
      "width": width,
      "height": height,
      "output_format": "png"
    };
    console.log(imageRequest);

    const data = await generateImageFromTextWithFeathral(imageRequest);
    if (q != null) {
      clearTimeout(q);
    }
    console.log(data);
    const image = document.createElement('img');
    image.src = "data:image/png;base64," + data.result.image;

    return { images: [image], feathral: data.feathral };
  }
  catch(error) {
    console.log(error);
    toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    return null;
  }
}

export async function generateFluxImage(prompt: string, image_size: {width: number, height: number}, mode: Mode, num_images: number, context: ImagingContext): Promise<ImagingResult> {
  console.log("running feathral");
  try {
    let q = null;
    if (context.awakeWarningToken) {
      q = setTimeout(() => {
        toastStore.trigger({ message: `サーバがスリープ状態だと、生成の初動が遅れたり\n失敗したりすることがあります`, timeout: 3000});
        q = null;
      }, 10000);
      context.awakeWarningToken = false;
    }
    let imageRequest = {prompt, image_size, mode, num_images};
    console.log(imageRequest);

    const perf = performance.now();
    const data = await generateImageFromTextWithFlux(imageRequest);
    if (q != null) {
      clearTimeout(q);
    }
    console.log("generateImageFromTextWithFlux", performance.now() - perf);

    const images = [];
    for (let i = 0; i < data.result.images.length; i++) {
      const image = document.createElement('img');
      image.src = "data:image/png;base64," + data.result.images[i];
      images.push(image);
    }

    return { images, feathral: data.feathral };
  }
  catch(error) {
    console.log(error);
    toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    return null;
  }
}

export async function generateMarkedPageImages(imagingContext: ImagingContext, postfix: string, mode: Mode, onProgress: (progress: number) => void) {
  const marks = get(bookEditor).getMarks();
  const newPages = get(mainBook).pages.filter((p, i) => marks[i]);

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
    constraintLeaf(page.paperSize, leafLayout);
  }
  updateToken.set(true);
}


async function generateFrameImage(imagingContext: ImagingContext, postfix: string, mode: Mode, frame: FrameElement) {
  console.log("postfix", postfix);
  const result = await generateFluxImage(`${postfix}\n${frame.prompt}`, {width:1024,height:1024}, mode, 1, imagingContext);
  if (result != null) {
    await result.images[0].decode();
    const film = new Film();
    const media = new ImageMedia(createCanvasFromImage(result.images[0]));
    film.media = media;
    frame.filmStack.films.push(film);
    frame.gallery.push(media.canvas);
    imagingContext.succeeded++;
    redrawToken.set(true);
  } else {
    imagingContext.failed++;
  }
}

export function calculateCost(size: {width:number,height:number}, mode: Mode): number {
  const pixels = size.width * size.height;
  const costs: {[key: Mode]: number} = {
    "schnell": 1,
    "pro": 10,
    "chibi": 7,
    "manga": 7,
  };
  let cost = costs[mode];
  cost = Math.ceil(cost * pixels / 1024 / 1024);
  return cost;
}

