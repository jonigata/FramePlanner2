import type { Page } from '../../lib/book/book';
import { renderPage } from './renderPage';
import { toastStore } from '@skeletonlabs/skeleton';
import { canvasToBlob } from '../../lib/layeredCanvas/tools/imageUtil';
import { upscaleCanvas } from '../upscaleFilm';

export async function copyToClipboard(page: Page, upscales: boolean) {
  try {
    let canvas = await renderPage(page);
    console.log("copyToClipboard", canvas.width, canvas.height);

    if (upscales) {
      const newCanvas = await upscaleCanvas(canvas);
      if (!newCanvas) {return;}
      canvas = newCanvas;
    }
    console.log("copyToClipboard upscaled", canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas);
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    console.log(`Canvas content copied to clipboard. ${blob.type}`);
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});
  } catch (err) {
    console.error("Failed to copy canvas content to clipboard:", err);
  }
}
