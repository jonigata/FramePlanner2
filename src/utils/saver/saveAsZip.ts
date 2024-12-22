import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Page } from '../../lib/book/book';
import { renderPageToBlob, renderPageToPsd } from './renderPage';

export async function makeZip(pages: Page[], render: (page: Page) => Promise<Blob>, ext: string): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('book')!;

  for (let i = 0; i < pages.length; i++) {
    const pic = await render(pages[i]);
    folder.file(`page-${i+1}.${ext}`, pic);
  }

  const zipFile = await zip.generateAsync({type: 'blob'});
  return zipFile;
}

export async function saveAsPngZip(pages: Page[]) {
  const zipFile = await makeZip(pages, renderPageToBlob, 'png');
  saveAs(zipFile, `book.zip`);
}

export async function saveAsPsdZip(pages: Page[]) {
  const zipFile = await makeZip(pages, renderPageToPsd, 'psd');
  saveAs(zipFile, `book.psd.zip`);
}