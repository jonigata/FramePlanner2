import { FirebaseFileSystem } from '../lib/filesystem/firebaseFileSystem';
import { makeFolders } from '../lib/filesystem/fileSystem';

export async function buildShareFileSystem(referenceUserId: string): Promise<FirebaseFileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.openShared(referenceUserId);

  const specialFolders = ['画像'];
  await makeFolders(fs, specialFolders);

  return fs;
}

export async function buildCloudFileSystem(): Promise<FirebaseFileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.openCloud();

  const specialFolders = ['画像', 'キャビネット'];
  await makeFolders(fs, specialFolders);

  return fs;
}
