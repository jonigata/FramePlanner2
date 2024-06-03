import type { FileSystem } from '../lib/filesystem/fileSystem';
import { MockFileSystem } from '../lib/filesystem/mockFileSystem';

export async function buildFileSystem(): Promise<FileSystem> {
  const fs = new MockFileSystem();
  const root = await fs.getRoot();

  const specialFolders = ['デスクトップ', 'キャビネット', 'ごみ箱', 'テンプレート', '画像', 'プリファレンス', '素材'];

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
