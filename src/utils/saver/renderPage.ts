import type { Page } from '../../bookeditor/book';
import { LayeredCanvas, Viewport } from '../../lib/layeredCanvas/system/layeredCanvas'
import { PaperRendererLayer } from '../../lib/layeredCanvas/layers/paperRendererLayer';

export async function renderPage(page: Page): Promise<Blob> {
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

  const png: Blob = await new Promise((r) => {canvas.toBlob(r, 'image/png')});
  return png;
}
