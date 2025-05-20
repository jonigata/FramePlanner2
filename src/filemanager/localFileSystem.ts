import { type FileSystem, makeFolders } from '../lib/filesystem/fileSystem.js';
import { FSAFileSystem, FSAFilePersistenceProvider } from '../lib/filesystem/fsaFileSystem.js';
import { FSABlobStore } from '../lib/filesystem/sqlite/BlobStore.js';
import { specialFolders } from './specialFolders.js';

export async function buildFileSystem(handle: FileSystemDirectoryHandle): Promise<FileSystem> {
  // PersistenceProviderの生成とDirectoryHandleのセット
  const persistenceProvider = new FSAFilePersistenceProvider(handle);

  // BlobStoreの生成とopen
  const blobStore = new FSABlobStore();
  await blobStore.open(handle);

  // FSAFileSystem生成
  const fs = new FSAFileSystem(persistenceProvider, blobStore);
  await fs.open();

  fs.withoutPersist(async () => {
    await makeFolders(fs, specialFolders);
  });

  return fs;
}
