import { type FileSystem, makeFolders } from '../lib/filesystem/fileSystem';
import { FSAFileSystem } from '../lib/filesystem/fsaFileSystem';
import { specialFolders } from './specialFolders';

export async function buildFileSystem(handle: FileSystemDirectoryHandle): Promise<FileSystem> {
  const fs = new FSAFileSystem();
  await fs.open(handle);

  fs.withoutPersist(async () => {
    await makeFolders(fs, specialFolders);
  });

  return fs;
}
