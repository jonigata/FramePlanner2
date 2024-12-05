import { SupabaseFileSystem } from '../lib/filesystem/supabaseFileSystem';
import { makeFolders } from '../lib/filesystem/fileSystem';

export async function buildShareFileSystem(referenceUserId: string | null): Promise<SupabaseFileSystem> {
  const fs = new SupabaseFileSystem();
  await fs.openShared(referenceUserId);

  const specialFolders = ['画像'];
  await makeFolders(fs, specialFolders);

  return fs;
}

export async function buildCloudFileSystem(): Promise<SupabaseFileSystem> {
  const fs = new SupabaseFileSystem();
  await fs.openCloud();

  // garbageCollectionがデスクトップ前提になっているので
  const specialFolders = ['デスクトップ', 'キャビネット', 'ごみ箱', 'テンプレート', '画像', 'プリファレンス', '素材'];
  await makeFolders(fs, specialFolders);

  return fs;
}
