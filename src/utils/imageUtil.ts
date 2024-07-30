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