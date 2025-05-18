import { type FileSystem, folderTree, makeFolders } from '../lib/filesystem/fileSystem';
import { FSAFileSystem } from '../lib/filesystem/fsaFileSystem';
import { specialFolders } from './specialFolders';

export async function buildFileSystem(handle: FileSystemDirectoryHandle): Promise<FileSystem> {
  const fs = new FSAFileSystem();
  await fs.open(handle);

  await makeFolders(fs, specialFolders);
  // const tree = await folderTree(fs);
  // console.log(tree);

  return fs;
}
