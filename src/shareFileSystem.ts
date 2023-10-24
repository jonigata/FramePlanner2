import type { FileSystem } from './lib/filesystem/fileSystem';
import { FirebaseFileSystem } from './lib/filesystem/firebaseFileSystem';

export async function buildFileSystem(referenceUserId: string): Promise<FileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.open(referenceUserId);
  const root = await fs.getRoot();

  const imageFolder = await root.getEntryByName('画像');
  if (!imageFolder) {
    const images = await fs.createFolder();
    await root.link('画像', images.id);
  } else {
    console.log('画像フォルダーはすでに存在します');
  }

  return fs;
}
