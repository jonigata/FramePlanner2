// ローカル(=ユーザー端末にインストールされた)フォントを扱うユーティリティ。
//
// アプローチは2系統:
//   1. queryLocalFonts()  — Local Font Access API。Chrome/Edge デスクトップのみ。
//      FontData の blob を取って FontFace で読み込み、document.fonts に登録する。
//   2. @font-face + local() — どのブラウザでも動く。Family Name のほか
//      PostScript Name / Full Font Name でもマッチを試みる。

import { registerRuntimeFontWeight } from "./bubbleinspector/fontWeightMap";

type FontDataLike = {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob(): Promise<Blob>;
};

declare global {
  interface Window {
    queryLocalFonts?: (options?: { postscriptNames?: string[] }) => Promise<FontDataLike[]>;
  }
}

export type InstalledFontGroup = {
  family: string;
  variants: { postscriptName: string; fullName: string; style: string; data: FontDataLike }[];
};

const registeredFamilies = new Set<string>();
const declaredKeys = new Set<string>();
const runtimeWeights = new Map<string, Set<string>>();

let styleEl: HTMLStyleElement | null = null;

function appendCssRule(rule: string): void {
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-frameplanner", "local-fonts");
    document.head.appendChild(styleEl);
  }
  styleEl.appendChild(document.createTextNode(rule + "\n"));
}

function escapeCssString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// 入力された family name から、PostScript Name / Full Font Name 風の派生候補を作る。
// local() マッチが効くようにするための保険。
function buildLocalNameVariants(family: string): string[] {
  const trimmed = family.trim();
  const noSpace = trimmed.replace(/\s+/g, "");
  const dashed = trimmed.replace(/\s+/g, "-");
  const variants = new Set<string>([
    trimmed,
    noSpace,
    dashed,
    `${trimmed} Regular`,
    `${trimmed}-Regular`,
    `${dashed}-Regular`,
    `${noSpace}-Regular`,
    `${noSpace}Regular`,
  ]);
  return [...variants].filter(v => v.length > 0);
}

export function isLocalFontAccessSupported(): boolean {
  return typeof window !== "undefined" && typeof window.queryLocalFonts === "function";
}

export function isLocalFontRegistered(family: string): boolean {
  return registeredFamilies.has(family);
}

export function getRuntimeWeights(family: string): string[] | null {
  const set = runtimeWeights.get(family);
  return set ? [...set].sort() : null;
}

function recordWeight(family: string, weight: string): void {
  let set = runtimeWeights.get(family);
  if (!set) {
    set = new Set();
    runtimeWeights.set(family, set);
  }
  set.add(weight);
  registerRuntimeFontWeight(family, weight);
}

// @font-face の local() ルールを差し込む。既に同じ family/weight で差し込み済みなら no-op。
// 一致するインストール済みフォントが無い場合は何も起きない (ブラウザのフォールバック動作)。
export function declareLocalFont(family: string, weight: string = "400"): void {
  const trimmed = family.trim();
  if (!trimmed) return;
  const key = `${trimmed}::${weight}`;
  if (declaredKeys.has(key)) return;
  declaredKeys.add(key);

  const variants = buildLocalNameVariants(trimmed);
  const localList = variants.map(v => `local("${escapeCssString(v)}")`).join(", ");
  const rule = `@font-face { font-family: "${escapeCssString(trimmed)}"; src: ${localList}; font-weight: ${weight}; font-display: swap; }`;
  appendCssRule(rule);
  recordWeight(trimmed, weight);
}

const VERIFY_TEXT = "あいうえおABCDE12345";

// canvas 上で family が解決されているか判定する。
// 失敗時のフォールバック (serif) と幅が違えば「解決された」とみなす。
export async function verifyCanvasFontAvailable(
  family: string,
  weight: string,
  retries: number,
  intervalMs: number,
): Promise<boolean> {
  await document.fonts.ready;
  for (let i = 0; i < retries; i++) {
    if (measureDiffersFromFallback(family, weight)) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

function measureDiffersFromFallback(family: string, weight: string): boolean {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.font = `${weight} 24px "${escapeCssString(family)}"`;
  const target = ctx.measureText(VERIFY_TEXT).width;
  ctx.font = `${weight} 24px serif`;
  return ctx.measureText(VERIFY_TEXT).width !== target;
}

// テキスト入力経由で指定された family を local() ベースで登録し、検証する。
// 検証結果を返すだけで、登録自体は無条件に行う (ユーザーが「とにかく適用」したい場合のため)。
export async function tryRegisterTypedLocalFont(
  family: string,
  weight: string = "400",
): Promise<boolean> {
  declareLocalFont(family, weight);
  const ok = await verifyCanvasFontAvailable(family, weight, 6, 40);
  if (ok) registeredFamilies.add(family);
  return ok;
}

export async function queryInstalledFonts(): Promise<InstalledFontGroup[]> {
  if (!isLocalFontAccessSupported()) return [];
  const fonts = await window.queryLocalFonts!();
  const map = new Map<string, InstalledFontGroup>();
  for (const f of fonts) {
    let g = map.get(f.family);
    if (!g) {
      g = { family: f.family, variants: [] };
      map.set(f.family, g);
    }
    g.variants.push({
      postscriptName: f.postscriptName,
      fullName: f.fullName,
      style: f.style,
      data: f,
    });
  }
  return [...map.values()].sort((a, b) => a.family.localeCompare(b.family));
}

export function deriveWeightFromStyle(style: string): string {
  const s = style.toLowerCase();
  if (/(thin|hairline)/.test(s)) return "100";
  if (/(extra|ultra)\s*light/.test(s)) return "200";
  if (/light/.test(s)) return "300";
  if (/medium/.test(s)) return "500";
  if (/(semi|demi)\s*bold/.test(s)) return "600";
  if (/(extra|ultra)\s*bold/.test(s)) return "800";
  if (/(black|heavy)/.test(s)) return "900";
  if (/bold/.test(s)) return "700";
  return "400";
}

export function deriveSlantFromStyle(style: string): "normal" | "italic" {
  return /(italic|oblique)/i.test(style) ? "italic" : "normal";
}

// queryLocalFonts() で得た FontData 群 (1 family の全 variants) を一括ロードする。
// 同じ weight+slant の重複は最初の 1 つだけ採用。
export async function loadInstalledFontGroup(group: InstalledFontGroup): Promise<void> {
  const seen = new Set<string>();
  for (const v of group.variants) {
    const weight = deriveWeightFromStyle(v.style);
    const slant = deriveSlantFromStyle(v.style);
    const dedupKey = `${weight}:${slant}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    try {
      const blob = await v.data.blob();
      const buf = await blob.arrayBuffer();
      const ff = new FontFace(group.family, buf, { style: slant, weight });
      await ff.load();
      document.fonts.add(ff);
      recordWeight(group.family, weight);
    } catch (e) {
      console.warn("loadInstalledFontGroup variant failed", group.family, v.postscriptName, e);
    }
  }
  registeredFamilies.add(group.family);
  await document.fonts.ready;
}
