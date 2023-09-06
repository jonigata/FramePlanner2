import type { FileSystem } from './fileSystem';
import { MockFileSystem } from './mockFileSystem';
import { frameExamples } from '../layeredCanvas/frameExamples.js';
import { newFile } from "../../fileManagerStore";

// TODO: ファイルの置き場所がおかしい感じ？

export async function makeSample(): Promise<FileSystem> {
  const fs = new MockFileSystem();
  const root = await fs.getRoot();

  const desktop = await fs.createFolder();
  await root.link('デスクトップ', desktop);

  const cabinet = await fs.createFolder();
  await root.link('キャビネット', cabinet);

  const trash = await fs.createFolder();
  await root.link('ごみ箱', trash);

  const templates = await fs.createFolder();
  await root.link('テンプレート', templates);

  const images = await fs.createFolder();
  await root.link('画像', images);

  await addFolder(fs, cabinet, 'キャプテン', 1);

  await addFolder(fs, cabinet, 'ギャンブルレーサー', 1);
/*
  await addFolder(fs, cabinet, 'HUNTER x HUNTER', 2);
  await addFolder(fs, cabinet, 'へうげもの', 2);
  const f = await addFolder(fs, cabinet, '絶対☆霊域', 2);
  await addFile(fs, f, `page0`);
*/

  return fs;
}

async function addFolder(fs, parent, name, count) {
  const folder = await fs.createFolder();
  await parent.link(name, folder);
  for (let i = 0; i < count; i++) {
    await addFile(fs, folder, `page0${i + 1}`);
  }
  return folder;
}

let index = 0;

async function addFile(fs, folder, name) {
  await newFile(fs, folder, name, index++ % frameExamples.length);
}
