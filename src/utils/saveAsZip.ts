import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Page, Book } from '../bookeditor/book';
import { LayeredCanvas, Viewport, Paper } from '../lib/layeredCanvas/system/layeredCanvas'
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';

interface CustomCanvasElement extends HTMLCanvasElement {
  paper: any;
}

export async function saveAsZip(book: Book) {
  const zip = new JSZip();
  const folderName = 'book';
  const folder = zip.folder(folderName);

  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];

    const canvas = document.createElement("canvas") as CustomCanvasElement;
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
    folder.file(`page-${i+1}.png`, png);
  }

  const zipFile = await zip.generateAsync({type: 'blob'});
  saveAs(zipFile, `${folderName}.zip`);
}
