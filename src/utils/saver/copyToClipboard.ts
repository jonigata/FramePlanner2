import type { Page } from '../../lib/book/book';
import { renderPageToBlob } from './renderPage';

export async function copyToClipboard(page: Page) {
  try {
      // CanvasをBlobとして取得する
      const blob = await renderPageToBlob(page);

      if (blob) {
          // BlobをClipboardItemとしてクリップボードに書き込む
          await navigator.clipboard.write([
              new ClipboardItem({[blob.type]: blob}),
          ]);
          console.log(`Canvas content copied to clipboard. ${blob.type}`);
      } else {
          console.error("Failed to copy canvas content to clipboard: Blob is null.");
      }
  } catch (err) {
      console.error("Failed to copy canvas content to clipboard:", err);
  }
}

