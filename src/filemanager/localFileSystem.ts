import { type FileSystem, makeFolders } from '../lib/filesystem/fileSystem.js';
import { FSAFileSystem } from '../lib/filesystem/fsaFileSystem.js';
import { specialFolders } from './specialFolders.js';

export async function buildFileSystem(handle: FileSystemDirectoryHandle): Promise<FileSystem> {
  const fs = new FSAFileSystem();
  await fs.open(handle);

  fs.withoutPersist(async () => {
    await makeFolders(fs, specialFolders);
  });

  return fs;
}
