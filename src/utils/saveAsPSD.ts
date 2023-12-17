import { writePsd } from 'ag-psd';
import { saveAs } from 'file-saver';
import type { Page } from '../bookeditor/page';
import { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas'
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';

interface CustomCanvasElement extends HTMLCanvasElement {
  paper: any;
}

export function saveAsPSD(page: Page) {
  const canvas = document.createElement("canvas") as CustomCanvasElement;
  canvas.width = page.paperSize[0]
  canvas.height = page.paperSize[1]
  canvas.paper = {};
  canvas.paper.size = page.paperSize;
  canvas.paper.translate = [0,0];
  canvas.paper.viewTranslate = [0,0];
  canvas.paper.scale = [1,1];

  const layeredCanvas = new LayeredCanvas(
    canvas, 
    (p: [number, number], s: String) => {},
    false);

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
        children: []
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
