import type { FileSystem } from './lib/filesystem/fileSystem';
import { IndexedDBFileSystem } from './lib/filesystem/indexeddbFileSystem';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new IndexedDBFileSystem();
  await fs.open();
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

  return fs;
}
