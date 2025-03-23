import { saveAs } from 'file-saver';
import type { Page } from '../../lib/book/book';
import { renderPageToPngBlob } from './renderPage';

export async function saveAsPng(page: Page) {
  const png = await renderPageToPngBlob(page);
  saveAs(png, 'comic.png');
}
