import { type FileSystem, folderTree, makeFolders } from '../lib/filesystem/fileSystem';
import { IndexedDBFileSystem } from '../lib/filesystem/indexeddbFileSystem';
import { specialFolders } from './specialFolders';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new IndexedDBFileSystem();
  await fs.open();

  await makeFolders(fs, specialFolders);
  // const tree = await folderTree(fs);
  // console.log(tree);

  return fs;
}
