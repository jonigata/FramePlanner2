import { type FileSystem, makeFolders } from '../lib/filesystem/fileSystem';
import { MockFileSystem } from '../lib/filesystem/mockFileSystem';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new MockFileSystem();

  const specialFolders = ['デスクトップ', 'キャビネット', 'ごみ箱', 'テンプレート', '画像', 'プリファレンス', '素材'];
  await makeFolders(fs, specialFolders);

  return fs;
}
