import type { Page } from '../../lib/book/book';
import { LayeredCanvas, Viewport } from '../../lib/layeredCanvas/system/layeredCanvas'
import { PaperRendererLayer } from '../../lib/layeredCanvas/layers/paperRendererLayer';

export async function renderPageToBlob(page: Page): Promise<Blob> {
  const canvas = await renderPage(page);
  const png: Blob = await new Promise(
    (r) => {
      canvas.toBlob(
        blob => r(blob ?? new Blob()), 'image/png')
    });
  return png;
}

export async function renderThumbnailToBlob(page: Page, [w,h]: [number, number]): Promise<Blob> {
  // keep aspect ratio
  const canvas = await renderPage(page);
  const aspect = canvas.width / canvas.height;
  const width = Math.min(w, h * aspect);
  const height = Math.min(h, w / aspect);

  const thumbnailCanvas = document.createElement("canvas");
  thumbnailCanvas.width = width;
  thumbnailCanvas.height = height;

  const ctx = thumbnailCanvas.getContext('2d');
  if (!ctx) throw new Error("Failed to get context");
  ctx.drawImage(canvas, 0, 0, width, height);
  const png: Blob = await new Promise(
    (r) => {
      thumbnailCanvas.toBlob(
        blob => r(blob ?? new Blob()), 'image/png')
    });
  return png;
}

export async function renderPageToDataUrl(page: Page): Promise<string> {
  const canvas = await renderPage(page);
  const png: string = canvas.toDataURL('image/png');
  return png;
}

async function renderPage(page: Page): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = page.paperSize[0]
  canvas.height = page.paperSize[1]

  const viewport = new Viewport(canvas, () => {});

  const layeredCanvas = new LayeredCanvas(viewport, true);
  layeredCanvas.rootPaper.size = page.paperSize;

  // renderer
  const paperRendererLayer = new PaperRendererLayer();
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  layeredCanvas.rootPaper.addLayer(paperRendererLayer);

  layeredCanvas.render();
  return canvas;
}
