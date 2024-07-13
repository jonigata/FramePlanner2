import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Page } from '../../bookeditor/book';
import { renderPageToBlob } from './renderPage';

export async function saveAsZip(pages: Page[]) {
  const zip = new JSZip();
  const folderName = 'book';
  const folder = zip.folder(folderName);

  for (let i = 0; i < pages.length; i++) {
    const png = await renderPageToBlob(pages[i]);
    folder.file(`page-${i+1}.png`, png);
  }

  const zipFile = await zip.generateAsync({type: 'blob'});
  saveAs(zipFile, `${folderName}.zip`);
}
