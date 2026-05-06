import { FileSystem } from '../lib/filesystem/fileSystem';
import { makeFolders } from '../lib/filesystem/fileSystem';

export const specialFolders = [
  "デスクトップ",
  "キャビネット",
  "ごみ箱",
  "テンプレート",
  "コマ割りテンプレート",
  "画像",
  "動画",
  "プリファレンス",
  "素材",
  "AI",
  "AI/キャラクター",
  "倉庫",
  "素材集" // 素材集のタブ化で導入 "素材集/よく使うもの"を"素材"へのリンクとする
];

export async function makeSpecialFolders(fs: FileSystem) {
  await makeFolders(fs, specialFolders);
  const root = await fs.getRoot();

  const sozaiFolder = (await root.getNodeByName('素材'))?.asFolder();
  const sozaisyuFolder = (await root.getNodeByName('素材集'))?.asFolder();
  if (!sozaiFolder) {
    throw new Error('素材フォルダが見つかりません(unexpected)');
  }
  if (!sozaisyuFolder) {
    throw new Error('素材集フォルダが見つかりません(unexpected)');
  }
  const yoku = await sozaisyuFolder.getNodeByName('よく使うもの');
  if (!yoku) {
    await sozaisyuFolder.link('よく使うもの', sozaiFolder.id);
  } 
}
