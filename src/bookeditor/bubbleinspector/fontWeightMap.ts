// 書体ごとの利用可能なフォントウェイト
// ローカルフォントは単一ウェイトのフォントファイルしかないため、1つだけ
// Google Fontsは公式の対応ウェイト

export const fontWeightMap: Record<string, string[]> = {
  // ローカルフォント（単一ウェイト）
  "源暎アンチック": ["400"],
  "源暎エムゴ": ["400"],
  "源暎ぽっぷる": ["400"],
  "源暎ラテゴ": ["400"],
  "源暎ラテミン": ["400"],
  "源暎きわみゴ": ["700"],
  "ふい字": ["400"],
  "まきばフォント": ["400"],

  // Google Fonts
  "BIZ UDGothic": ["400", "700"],
  "BIZ UDMincho": ["400", "700"],
  "BIZ UDPGothic": ["400", "700"],
  "BIZ UDPMincho": ["400", "700"],
  "Dela Gothic One": ["400"],
  "DotGothic16": ["400"],
  "Hachi Maru Pop": ["400"],
  "Hina Mincho": ["400"],
  "IBM Plex Sans JP": ["100", "200", "300", "400", "500", "600", "700"],
  "Kaisei Decol": ["400", "500", "700"],
  "Kaisei HarunoUmi": ["400", "500", "700"],
  "Kaisei Opti": ["400", "500", "700"],
  "Kaisei Tokumin": ["400", "500", "700", "800"],
  "Kiwi Maru": ["300", "400", "500"],
  "Klee One": ["400", "600"],
  "Kosugi": ["400"],
  "Kosugi Maru": ["400"],
  "M PLUS 1": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "M PLUS 1 Code": ["100", "200", "300", "400", "500", "600", "700"],
  "M PLUS 1p": ["100", "300", "400", "500", "700", "800", "900"],
  "M PLUS 2": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "M PLUS Rounded 1c": ["100", "300", "400", "500", "700", "800", "900"],
  "Mochiy Pop One": ["400"],
  "Mochiy Pop P One": ["400"],
  "New Tegomin": ["400"],
  "Noto Sans JP": ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  "Noto Serif JP": ["200", "300", "400", "500", "600", "700", "800", "900"],
  "Potta One": ["400"],
  "Rampart One": ["400"],
  "Reggae One": ["400"],
  "RocknRoll One": ["400"],
  "Sawarabi Gothic": ["400"],
  "Shippori Antique": ["400"],
  "Shippori Antique B1": ["400"],
  "Shippori Mincho": ["400", "500", "600", "700", "800"],
  "Shippori Mincho B1": ["400", "500", "600", "700", "800"],
  "Stick": ["400"],
  "Yomogi": ["400"],
  "Yuji Boku": ["400"],
  "Yuji Mai": ["400"],
  "Yuji Syuku": ["400"],
  "Yusei Magic": ["400"],
  "Zen Antique": ["400"],
  "Zen Antique Soft": ["400"],
  "Zen Kaku Gothic Antique": ["300", "400", "500", "700", "900"],
  "Zen Kaku Gothic New": ["300", "400", "500", "700", "900"],
  "Zen Kurenaido": ["400"],
  "Zen Maru Gothic": ["300", "400", "500", "700", "900"],
  "Zen Old Mincho": ["400", "500", "600", "700", "900"],
  "Shizuru": ["400"],
  "Cherry Bomb One": ["400"],
  "Slackside One": ["400"],
  "Darumadrop One": ["400"],
};

export const fontWeightLabels: Record<string, string> = {
  "100": "100 Thin",
  "200": "200 ExtraLight",
  "300": "300 Light",
  "400": "400 Regular",
  "500": "500 Medium",
  "600": "600 SemiBold",
  "700": "700 Bold",
  "800": "800 ExtraBold",
  "900": "900 Black",
};

// queryLocalFonts() 等で実行時に発見したフォントの weight を保持する。
// fontWeightMap に登録の無いフォントはこちらが優先される。
const runtimeFontWeightMap: Record<string, Set<string>> = {};

export function registerRuntimeFontWeight(fontFamily: string, weight: string): void {
  if (!runtimeFontWeightMap[fontFamily]) {
    runtimeFontWeightMap[fontFamily] = new Set();
  }
  runtimeFontWeightMap[fontFamily].add(weight);
}

export function getAvailableWeights(fontFamily: string): string[] {
  const baseline = fontWeightMap[fontFamily];
  if (baseline) return baseline;
  const runtime = runtimeFontWeightMap[fontFamily];
  if (runtime && runtime.size > 0) return [...runtime].sort();
  return ["400"];
}
