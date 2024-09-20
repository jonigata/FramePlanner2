import { type FileSystem, makeFolders } from '../lib/filesystem/fileSystem';
import { IndexedDBFileSystem } from '../lib/filesystem/indexeddbFileSystem';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new IndexedDBFileSystem();
  await fs.open();

  const specialFolders = ['デスクトップ', 'キャビネット', 'ごみ箱', 'テンプレート', '画像', 'プリファレンス', '素材'];
  await makeFolders(fs, specialFolders);

  return fs;
}
