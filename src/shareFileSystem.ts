import type { FileSystem } from './lib/filesystem/fileSystem';
import { FirebaseFileSystem } from './lib/filesystem/firebaseFileSystem';

export async function buildFileSystem(referenceUserId: string): Promise<FileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.open(referenceUserId);
  const root = await fs.getRoot();

  if (!referenceUserId) { // TODO: 「なければ作る」ようにする
    const images = await fs.createFolder();
    await root.link('画像', images.id);
  }

  return fs;
}
