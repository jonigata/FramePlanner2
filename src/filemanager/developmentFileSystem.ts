import { type FileSystem } from '../lib/filesystem/fileSystem';
import { MockFileSystem } from '../lib/filesystem/mockFileSystem';
import { makeSpecialFolders } from './specialFolders';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new MockFileSystem();

  await makeSpecialFolders(fs);

  return fs;
}
