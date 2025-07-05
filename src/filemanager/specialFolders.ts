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
  "倉庫"
];

export async function makeSpecialFolders(fs: any) {
  return await makeFolders(fs, specialFolders);
}
