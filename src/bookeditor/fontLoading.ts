import { loadGoogleFontForCanvas } from "../lib/layeredCanvas/tools/googleFont";
import { fontWeightMap } from "./bubbleinspector/fontWeightMap";
import { declareLocalFont, isLocalFontRegistered } from "./localFonts";

export async function loadFonts(fonts: { family: string, weight: string }[]): Promise<boolean> {
  let result = false;
  for (let font of fonts) {
    if (await loadFont(font.family, font.weight)) {
      result = true;
    }
  }
  return result;
}

const localFontFiles: { [key: string]: string } = {
  '源暎アンチック': 'GenEiAntiqueNv5-M',
  '源暎エムゴ': 'GenEiMGothic2-Black',
  '源暎ぽっぷる': 'GenEiPOPle-Bk',
  '源暎ラテゴ': 'GenEiLateMinN_v2',
  '源暎ラテミン': 'GenEiLateMinN_v2',
  '源暎きわみゴ': 'GenEiKiwamiGo',
  "ふい字": 'HuiFont29',
  "まきばフォント": 'MakibaFont13',
}

const cache = new Set<string>();

// キャッシュ機構(重複管理など)はFontFace APIが持っているので、基本的には余計なことはしなくてよい
// と思いきや一瞬ちらつくようなのでキャッシュする
export async function loadFont(family: string, weight: string): Promise<boolean> {
  const key = `${family}:${weight}`;
  if (cache.has(key)) { return false; }

  try {
    const localFile = localFontFiles[family];
    console.log("load font", family, weight, localFile)
    if (localFile) {
      const url = `/fonts/${localFile}.woff2`;
      const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });
      await font.load();
      document.fonts.add(font);
    } else if (isLocalFontRegistered(family)) {
      // FontChooser の Local Font Access API 経由で既にロード済み
    } else if (fontWeightMap[family]) {
      // FramePlanner がカタログしている Google Font
      await loadGoogleFontForCanvas(family, [weight]);
    } else {
      // ユーザーが手入力したと思われる名前。@font-face の local() を差し込み、
      // PostScript Name / Full Font Name でのマッチも狙う。
      // 一致するインストール済みフォントが無い場合はブラウザのフォールバック動作になる。
      declareLocalFont(family, weight);
    }
    cache.add(key);
    return true;
  }
  catch (e) {
    console.error(e);
    return false;
  }
}
