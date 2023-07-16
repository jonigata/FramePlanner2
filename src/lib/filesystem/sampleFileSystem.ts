import type { FileSystem } from './fileSystem';
import { MockFileSystem } from './mockFileSystem';

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

  const comic1 = await fs.createFolder();
  await cabinet.link('ギャンブルレーサー', comic1);
  await comic1.link('page01', await fs.createFile());
  await comic1.link('page02', await fs.createFile());
  await comic1.link('page03', await fs.createFile());

  const comic2 = await fs.createFolder();
  await cabinet.link('HUNTER x HUNTER', comic2);
  await comic2.link('page01', await fs.createFile());
  await comic2.link('page02', await fs.createFile());

  const comic3 = await fs.createFolder();
  await cabinet.link('へうげもの', comic3);
  await comic3.link('page01', await fs.createFile());

  const comic4 = await fs.createFolder();
  await cabinet.link('絶対☆霊域', comic3);
  await comic4.link('page01', await fs.createFile());
  await comic4.link('page02', await fs.createFile());

  const comic5 = await fs.createFolder();
  await comic5.link('page01', await fs.createFile());

  return fs;
}
