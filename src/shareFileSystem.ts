import type { FileSystem } from './lib/filesystem/fileSystem';
import { FirebaseFileSystem } from './lib/filesystem/firebaseFileSystem';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.open();
  const root = await fs.getRoot();

  const images = await fs.createFolder();
  await root.link('画像', images.id);

  return fs;
}
