import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Page } from '../../lib/book/book';
import { renderPageToBlob } from './renderPage';

export async function makeZip(pages: Page[]): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('book')!;

  for (let i = 0; i < pages.length; i++) {
    const png = await renderPageToBlob(pages[i]);
    folder.file(`page-${i+1}.png`, png);
  }

  const zipFile = await zip.generateAsync({type: 'blob'});
  return zipFile;
}

export async function saveAsZip(pages: Page[]) {
  const zipFile = await makeZip(pages);
  saveAs(zipFile, `book.zip`);
}
