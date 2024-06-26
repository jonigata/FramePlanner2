import { generateImageFromTextWithFeathral } from '../firebase';
import { toastStore } from '@skeletonlabs/skeleton';

export class GenerateImageContext {
  awakeWarningToken: boolean;
  errorToken: boolean;

  reset() {
    this.awakeWarningToken = true;
    this.errorToken = true;
  }
}

export async function generateImage(prompt: string, context: GenerateImageContext): Promise<HTMLImageElement> {
  console.log("running feathral");
  try {
    let q = null;
    if (context.awakeWarningToken) {
      q = setTimeout(() => {
        toastStore.trigger({ message: `サーバがスリープ状態だと、\n生成の初動が遅れることがあります`, timeout: 3000});
        q = null;
      }, 10000);
      context.awakeWarningToken = false;
    }
    let imageRequest = {
      "style": "anime",
      "prompt": prompt,
      "width": 1024,
      "height": 1024,
      "output_format": "png"
    };
    console.log(imageRequest);

    const data = await generateImageFromTextWithFeathral(imageRequest);
    if (q != null) {
      clearTimeout(q);
    }
    console.log(data);
    const img = document.createElement('img');
    img.src = "data:image/png;base64," + data.result.image;

    return img;
  }
  catch(error) {
    console.log(error);
    toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    return null;
  }
}
