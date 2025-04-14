import { saveAs } from 'file-saver';
import type { Page } from '../../lib/book/book';
import { renderPage } from './renderPage';
import { upscaleCanvas } from '../upscaleImage';
import { canvasToBlob } from '../../lib/layeredCanvas/tools/imageUtil';

export async function saveAsPng(page: Page, upscales: boolean) {
  let canvas = await renderPage(page);
  console.log("saveAsPng", canvas.width, canvas.height);

  if (upscales) {
    const newCanvas = await upscaleCanvas(canvas);
    if (!newCanvas) {return;}
    canvas = newCanvas;
  }
  console.log("saveAsPng upscaled", canvas.width, canvas.height);

  const blob = await canvasToBlob(canvas, "image/png");
  saveAs(blob, 'comic.png');
}
