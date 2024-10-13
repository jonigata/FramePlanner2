import { writePsd } from 'ag-psd';
import { saveAs } from 'file-saver';
import type { Page } from '../../bookeditor/book';
import { LayeredCanvas, Viewport } from '../../lib/layeredCanvas/system/layeredCanvas'
import { PaperRendererLayer } from '../../lib/layeredCanvas/layers/paperRendererLayer';

interface CustomCanvasElement extends HTMLCanvasElement {
  paper: any;
}

export function saveAsPSD(page: Page) {
  const canvas = document.createElement("canvas");
  canvas.width = page.paperSize[0]
  canvas.height = page.paperSize[1]

  const viewport = new Viewport(canvas, () => {});

  const layeredCanvas = new LayeredCanvas(viewport, true);
  layeredCanvas.rootPaper.size = page.paperSize;

  const paperRendererLayer = new PaperRendererLayer();
  layeredCanvas.rootPaper.addLayer(paperRendererLayer);

  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);

  const {frames, bubbles} = paperRendererLayer.renderApart();

  const psd = {
    width: page.paperSize[0],
    height: page.paperSize[1],
    children: [
      {
        name: 'コマ',
        children: [] as any[]
      },
      {
        name: 'フキダシ',
        children: []
      }
    ]
  };

  frames.forEach((canvas, i) => {
    psd.children[0].children.push({
      name: `コマ #${i+1}`,
      canvas
    });
  });
  bubbles.forEach((canvas, i) => {
    psd.children[1].children.push({
      name: `フキダシ #${i+1}`,
      canvas
    });
  });

  const buffer = writePsd(psd);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, 'my-file.psd');
}
