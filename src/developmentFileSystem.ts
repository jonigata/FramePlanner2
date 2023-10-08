import type { FileSystem } from './lib/filesystem/fileSystem';
import { MockFileSystem } from './lib/filesystem/mockFileSystem';
import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
import { newPage, newFile } from "./fileManagerStore";

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new MockFileSystem();
  const root = await fs.getRoot();

  const desktop = await fs.createFolder();
  await root.link('デスクトップ', desktop.id);

  const cabinet = await fs.createFolder();
  await root.link('キャビネット', cabinet.id);

  const trash = await fs.createFolder();
  await root.link('ごみ箱', trash.id);

  const templates = await fs.createFolder();
  await root.link('テンプレート', templates.id);

  const images = await fs.createFolder();
  await root.link('画像', images.id);

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
  const page = newPage("sample-", index++ % frameExamples.length);
  await newFile(fs, folder, name, page);
}
