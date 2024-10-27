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
