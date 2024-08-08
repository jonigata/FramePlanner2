import { generateImageFromTextWithFeathral, generateImageFromTextWithFlux } from '../firebase';
import { toastStore } from '@skeletonlabs/skeleton';

export class GenerateImageContext {
  awakeWarningToken: boolean;
  errorToken: boolean;

  reset() {
    this.awakeWarningToken = true;
    this.errorToken = true;
  }
}

export type GenerateResult = {
  image: HTMLImageElement;
  feathral: number;
};

export async function generateImage(prompt: string, width: number, height: number, context: GenerateImageContext): Promise<GenerateResult> {
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

    return { image, feathral: data.feathral };
  }
  catch(error) {
    console.log(error);
    toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    return null;
  }
}

export async function generateFluxImage(prompt: string, image_size: string, pro: boolean, context: GenerateImageContext): Promise<GenerateResult> {
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
    let imageRequest = {prompt, image_size, pro};
    console.log(imageRequest);

    const perf = performance.now();
    const data = await generateImageFromTextWithFlux(imageRequest);
    if (q != null) {
      clearTimeout(q);
    }
    console.log("generateImageFromTextWithFlux", performance.now() - perf);
    const image = document.createElement('img');
    image.src = "data:image/png;base64," + data.result.image;

    return { image, feathral: data.feathral };
  }
  catch(error) {
    console.log(error);
    toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    return null;
  }
}
