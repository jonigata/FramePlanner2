import { createCanvasFromImage, imageToBase64 } from "../lib/layeredCanvas/tools/imageUtil";

export async function generateImages(url: string, imageRequest: any): Promise<HTMLCanvasElement[]> {
  url = removeLastSlash(url);
  try {
    const { positive, negative, width, height, samplingSteps, cfgScale, batchSize, batchCount, alwaysonScripts, samplerName } = imageRequest;
    const payload = {
      prompt: positive,
      negative_prompt: negative,
      steps: samplingSteps,
      cfg_scale: cfgScale,
      batch_size: batchSize,
      n_iter: batchCount,
      width: width,
      height: height,
      alwayson_scripts: alwaysonScripts,
      sampler_name: samplerName,
      save_images: false,
    };
    console.log(payload);

    const response = await fetch(`${url}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw `${url}: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();
    const images = data.images;

    const canvases = [];
    for (let i of images) {
        const img = document.createElement('img');
        img.src = "data:image/png;base64," + i;
        await img.decode();
        canvases.push(createCanvasFromImage(img));
    }
    return canvases;
  } catch (error) {
    console.error('sdwebui connection failed, generateImages:', error);
    throw error;
  }
}

export async function getProgression(url: string) {
  url = removeLastSlash(url);
  try {
    const response = await fetch(`${url}/sdapi/v1/progress`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('sdwebui connection failed, getProgression:', error);
  }
}

export async function getControlNetModuleList(url: string) {

}

export async function getControlNetModelList(url: string) {
  
}

function removeLastSlash(url: string) {
  if (url.endsWith('/')) {
    return url.slice(0, -1);
  }
  return url;
}

export async function generateImageWithScribble(url: string, refered: HTMLImageElement, prompt: string, lcm: boolean): Promise<HTMLCanvasElement> {
  await refered.decode();

  try {
    let imageRequest = {
      "positive": prompt + (lcm ? " <lora:pytorch_lora_weights:0.3>" : ""),
      "negative": "EasyNegative",
      "width": refered.naturalWidth,
      "height": refered.naturalHeight,
      "batchSize": 1,
      "batchCount": 1,
      "samplingSteps": 6,
      "cfgScale": 3,
      "samplerName": (lcm ? "DPM++ 2S a Karras" : "DPM++ 2M Karras" )
    }

    const alwaysonScripts = {
      controlNet: {
        args: [
          {
            input_image: imageToBase64(refered),
            module: "scribble_xdog",
            model: "control_v11p_sd15_scribble [d4ba51ff]",
            weight: 0.75,
            resize_mode: 0,
            threshold_a: 32,
          }
        ]
      }
    };

    const req = { ...imageRequest, alwaysonScripts };
    console.log(req);
    const newImages = await generateImages(url, req);
    return newImages[0];
  } catch (e) {
    console.log(e);
    // toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
    throw e;
  }
}

