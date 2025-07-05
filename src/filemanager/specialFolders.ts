import { FileSystem } from '../lib/filesystem/fileSystem';
import { makeFolders } from '../lib/filesystem/fileSystem';

export const specialFolders = [
  "デスクトップ", 
  "キャビネット", 
  "ごみ箱", 
  "テンプレート", 
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

  const sozai = (await root.getNodeByName('素材'))!;
  const sozaisyu = (await root.getNodeByName('素材集'))!.asFolder()!;
  const yoku = await sozaisyu.getNodeByName('よく使うもの');
  if (!yoku) {
    await sozaisyu.link('よく使うもの', sozai.id);
  } 
}

