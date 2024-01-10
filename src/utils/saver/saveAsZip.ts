import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Book } from '../../bookeditor/book';
import { renderPage } from './renderPage';

export async function saveAsZip(book: Book) {
  const zip = new JSZip();
  const folderName = 'book';
  const folder = zip.folder(folderName);

  for (let i = 0; i < book.pages.length; i++) {
    const png = await renderPage(book.pages[i]);
    folder.file(`page-${i+1}.png`, png);
  }

  const zipFile = await zip.generateAsync({type: 'blob'});
  saveAs(zipFile, `${folderName}.zip`);
}
