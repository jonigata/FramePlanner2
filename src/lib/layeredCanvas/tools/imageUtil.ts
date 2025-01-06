export function makePlainImage(w: number, h: number, color: string): HTMLCanvasElement {
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
