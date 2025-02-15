export function makePlainCanvas(w: number, h: number, color: string): HTMLCanvasElement {
  console.log("makeWhiteImage", w, h);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

export async function createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);
  return image;
}

export function createCanvasFromImage(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

export async function createImageFromCanvas(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = canvas.toDataURL();
  await image.decode();
  return image;
}

export async function createCanvasFromBlob(blob: Blob): Promise<HTMLCanvasElement> {
  const image = await createImageFromBlob(blob);
  return createCanvasFromImage(image);
}

export function copyCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const newCanvas = document.createElement("canvas");
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const ctx = newCanvas.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0);
  return newCanvas;
}

export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL();
}

export function imageToBase64(imgElement: HTMLImageElement) {
  let canvas = document.createElement("canvas");
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;
  canvas.getContext("2d")!.drawImage(imgElement, 0, 0);

  let base64Image = canvas.toDataURL("image/png");
  return base64Image;
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        throw new Error("Failed to convert canvas to blob");
      }
    }, "image/png");
  });
}

export async function getFirstFrameOfVideo(video: HTMLVideoElement): Promise<HTMLCanvasElement> {
  video.muted = true;
  await video.play();
  video.pause();
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);
  return canvas;
}

export async function imageToBlob(image: HTMLImageElement): Promise<Blob> {
  const canvas = createCanvasFromImage(image);
  return await canvasToBlob(canvas);
}

export async function createVideoFromDataUrl(dataUrl: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = true;
  video.src = dataUrl;
  await getFirstFrameOfVideo(video);
  return video;
}

export async function createVideoFromBlob(blob: Blob): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(blob);
  const video = await createVideoFromDataUrl(url);
  // URL.revokeObjectURL(url); ダウンロードできるようにrevokeしない
  return video;
}

export async function resizeImage(dataUrl: string, maxSize: number = 1024): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  await new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.src = dataUrl;
  });

  let width = img.width;
  let height = img.height;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx?.drawImage(img, 0, 0, width, height);
  
  return canvas.toDataURL();
}

export function resizeCanvas(canvas: HTMLCanvasElement, maxSize: number = 1024): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  let width = canvas.width;
  let height = canvas.height;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext('2d');
  ctx?.drawImage(canvas, 0, 0, width, height);
  
  return outputCanvas;
}

export function resizeCanvasIfNeeded(canvas: HTMLCanvasElement, maxSize: number = 1024): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;

  // サイズが制限以下なら単にコピーして返す
  if (width <= maxSize && height <= maxSize) {
    return copyCanvas(canvas);
  }

  // サイズが制限を超えている場合はリサイズ
  return resizeCanvas(canvas, maxSize);
}

export function computeAspectFitSize(r: DOMRect, [w,h]: [number, number]): { width: number, height: number } {
  const aspect = w / h;
  const rectAspect = r.width / r.height;
  if (aspect > rectAspect) {
    return { width: r.width, height: r.width / aspect };
  } else {
    return { width: r.height * aspect, height: r.height };
  }
}