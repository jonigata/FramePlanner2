import { type FileSystem, makeFolders } from '../lib/filesystem/fileSystem';
import { MockFileSystem } from '../lib/filesystem/mockFileSystem';
import { specialFolders } from './specialFolders';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new MockFileSystem();

  await makeFolders(fs, specialFolders);

  return fs;
}
