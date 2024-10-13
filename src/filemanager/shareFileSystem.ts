import { FirebaseFileSystem } from '../lib/filesystem/firebaseFileSystem';
import { makeFolders } from '../lib/filesystem/fileSystem';

export async function buildShareFileSystem(referenceUserId: string | null): Promise<FirebaseFileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.openShared(referenceUserId);

  const specialFolders = ['画像'];
  await makeFolders(fs, specialFolders);

  return fs;
}

export async function buildCloudFileSystem(): Promise<FirebaseFileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.openCloud();

  // garbageCollectionがデスクトップ前提になっているので
  const specialFolders = ['デスクトップ', 'キャビネット', 'ごみ箱', 'テンプレート', '画像', 'プリファレンス', '素材'];
  await makeFolders(fs, specialFolders);

  return fs;
}
