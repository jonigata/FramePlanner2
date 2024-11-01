import { AutoModel, AutoProcessor, env, RawImage, type PreTrainedModel, type Processor } from '@xenova/transformers';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

// Proxy the WASM backend to prevent the UI from freezing
env.backends.onnx.wasm.proxy = true;

let model: PreTrainedModel;
let processor: Processor;

export async function loadModel(status: (s: string) => void) {
  status("loading model");

  model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
      // Do not require config.json to be present in the repository
      config: { model_type: 'custom' },
  });

  processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
      // Do not require config.json to be present in the repository
      config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
      }
  });

  status("ready");
}

// Predict foreground of the given image
export async function predict(srcImage: HTMLImageElement): Promise<HTMLCanvasElement> {
    // image to blob
    // const blob = await imageToBlob(srcImage);

    // Read image
    // const image = await RawImage.fromBlob(blob);
    const image = await RawImage.fromURL(srcImage.src);

    // Preprocess image
    const { pixel_values } = await processor(image);

    // Predict alpha matte
    const { output } = await model({ input: pixel_values });

    // Resize mask back to original size
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;

    // Draw original image output to canvas
    ctx.drawImage(image.toCanvas(), 0, 0);

    // Update alpha channel
    const pixelData = ctx.getImageData(0, 0, image.width, image.height);
    let n = 0;
    for (let i = 0; i < mask.data.length; ++i) {
        if (0 < mask.data[i]) {
            n++;
        }
        pixelData.data[4 * i + 3] = mask.data[i];
    }
    ctx.putImageData(pixelData, 0, 0);

    // Update UI
    return canvas;
}

