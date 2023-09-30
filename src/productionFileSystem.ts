import type { FileSystem } from './lib/filesystem/fileSystem';
import { IndexedDBFileSystem } from './lib/filesystem/indexeddbFileSystem';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new IndexedDBFileSystem();
  await fs.open();
  const root = await fs.getRoot();

  const specialFolders = ['デスクトップ', 'キャビネット', 'ごみ箱', 'テンプレート', '画像'];

  const children = await root.list();
  for (const f of specialFolders) {
    const found = children.find((c) => c[1] === f);
    if (!found) {
      const folder = await fs.createFolder();
      await root.link(f, folder.id);
    }
  }

  return fs;
}
