import { type FileSystem } from '../lib/filesystem/fileSystem.js';
import { FSAFileSystem, FSAFilePersistenceProvider } from '../lib/filesystem/fsaFileSystem.js';
import { FSABlobStore } from '../lib/filesystem/sqlite/BlobStore.js';
import { SqlJsAdapter } from '../lib/filesystem/sqlite/SqlJsAdapter.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { makeSpecialFolders } from './specialFolders.js';
import { BrowserMediaConverter } from '../lib/filesystem/mediaConverter.js';

export async function buildFileSystem(handle: FileSystemDirectoryHandle): Promise<FileSystem> {
  // PersistenceProviderの生成とDirectoryHandleのセット
  const persistenceProvider = new FSAFilePersistenceProvider(handle);

  // BlobStoreの生成とopen
  const blobStore = new FSABlobStore();
  await blobStore.open(handle);

  // FSAFileSystem生成
  const sqlite = new SqlJsAdapter(persistenceProvider, wasmUrl);
  const mediaConverter = new BrowserMediaConverter();
  const fs = new FSAFileSystem(sqlite, blobStore, mediaConverter);
  await fs.open();

  fs.withoutPersist(async () => {
    await makeSpecialFolders(fs);
  });

  return fs;
}

export async function fileSystemExists(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const persistenceProvider = new FSAFilePersistenceProvider(handle);
  const sqlite = new SqlJsAdapter(persistenceProvider, wasmUrl);
  return await sqlite.exists();
}
