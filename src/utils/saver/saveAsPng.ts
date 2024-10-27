import { saveAs } from 'file-saver';
import type { Page } from '../../lib/book/book';
import { renderPageToBlob } from './renderPage';

export async function saveAsPng(page: Page) {
  const png = await renderPageToBlob(page);
  saveAs(png, 'comic.png');
}
