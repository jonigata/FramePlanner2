import { saveAs } from 'file-saver';
import type { Page } from '../../lib/book/book';
import { renderPageToPsd } from './renderPage';

export async function saveAsPsd(page: Page) {
  const psd = await renderPageToPsd(page);
  saveAs(psd, 'comic.psd');
}
