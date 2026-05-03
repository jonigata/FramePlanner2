// ローカル(=ユーザー端末にインストールされた)フォントを扱うユーティリティ。
//
// アプローチは2系統:
//   1. queryLocalFonts()  — Local Font Access API。Chrome/Edge デスクトップのみ。
//      FontData の blob を取って FontFace で読み込み、document.fonts に登録する。
//   2. @font-face + local() — どのブラウザでも動く。Family Name のほか
//      PostScript Name / Full Font Name でもマッチを試みる。

import { registerRuntimeFontWeight } from "./bubbleinspector/fontWeightMap";

const LOG_PREFIX = "[localFonts]";
const log = (...args: unknown[]): void => console.log(LOG_PREFIX, ...args);
const warn = (...args: unknown[]): void => console.warn(LOG_PREFIX, ...args);

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
  if (!trimmed) {
    log("declareLocalFont skip (empty)", { family });
    return;
  }
  const key = `${trimmed}::${weight}`;
  if (declaredKeys.has(key)) {
    log("declareLocalFont skip (already declared)", { family: trimmed, weight });
    return;
  }
  declaredKeys.add(key);

  const variants = buildLocalNameVariants(trimmed);
  const localList = variants.map(v => `local("${escapeCssString(v)}")`).join(", ");
  const rule = `@font-face { font-family: "${escapeCssString(trimmed)}"; src: ${localList}; font-weight: ${weight}; font-display: swap; }`;
  appendCssRule(rule);
  recordWeight(trimmed, weight);
  log("declareLocalFont", { family: trimmed, weight, variants });
}

const VERIFY_TEXT = "あいうえおABCDE12345";

// canvas 上で family が実際にレンダリングされるか判定する。
// 「target と serif の幅が違う」だけだと、target が見つからずブラウザ既定 (= sans-serif 等)
// にフォールバックしただけのケースを正と誤判定する。これを避けるため、
// 3 種の総称ファミリ (serif / sans-serif / monospace) を後続にした {target, fallback} と
// fallback 単独を比較し、すべての組で幅が変わる場合のみ「target が実際に使われた」と判定する。
function isFontActuallyUsed(family: string, weight: string): boolean {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    warn("isFontActuallyUsed: 2d context unavailable");
    return false;
  }
  const escaped = escapeCssString(family);
  const fallbacks = ["serif", "sans-serif", "monospace"] as const;
  const measurements: Record<string, { withTarget: number; withoutTarget: number; matched: boolean }> = {};
  let ok = true;
  for (const fb of fallbacks) {
    ctx.font = `${weight} 24px "${escaped}", ${fb}`;
    const withTarget = ctx.measureText(VERIFY_TEXT).width;
    ctx.font = `${weight} 24px ${fb}`;
    const withoutTarget = ctx.measureText(VERIFY_TEXT).width;
    const matched = withTarget !== withoutTarget;
    measurements[fb] = { withTarget, withoutTarget, matched };
    if (!matched) ok = false;
  }
  log("isFontActuallyUsed", { family, weight, ok, measurements });
  return ok;
}

async function waitNextFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise<void>(r => requestAnimationFrame(() => r()));
  }
}

export async function verifyCanvasFontAvailable(
  family: string,
  weight: string,
  retries: number,
  intervalMs: number,
): Promise<boolean> {
  const t0 = performance.now();
  log("verify start", { family, weight, retries, intervalMs });

  // append したばかりの <style> がスタイルツリーに反映されるのを待つ。
  await waitNextFrames(2);

  // document.fonts.ready は「現在追加済みかつ pending な face」を待つだけで、
  // 直前に declare した @font-face をスキップすることがある。spec を渡して明示的に load。
  const spec = `${weight} 24px "${escapeCssString(family)}"`;
  try {
    const loaded = await document.fonts.load(spec);
    log("document.fonts.load", { spec, count: loaded.length, faces: loaded.map(f => ({ family: f.family, weight: f.weight, status: f.status })) });
  } catch (e) {
    // CSS shorthand として不正な family 名 (例: 制御文字) のとき例外。
    // その場合は当然「見つからない」のでフォールバックスルー。
    log("document.fonts.load threw", { spec, error: String(e) });
  }
  await document.fonts.ready;

  for (let i = 0; i <= retries; i++) {
    if (isFontActuallyUsed(family, weight)) {
      log("verify ok", { family, weight, attempt: i, elapsedMs: Math.round(performance.now() - t0) });
      return true;
    }
    if (i < retries) await new Promise(r => setTimeout(r, intervalMs));
  }
  log("verify fail", { family, weight, attempts: retries + 1, elapsedMs: Math.round(performance.now() - t0) });
  return false;
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
  log("tryRegisterTypedLocalFont", { family, weight, ok });
  return ok;
}

export async function queryInstalledFonts(): Promise<InstalledFontGroup[]> {
  if (!isLocalFontAccessSupported()) {
    log("queryInstalledFonts: API not supported");
    return [];
  }
  const t0 = performance.now();
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
  const groups = [...map.values()].sort((a, b) => a.family.localeCompare(b.family));
  log("queryInstalledFonts", { rawCount: fonts.length, familyCount: groups.length, elapsedMs: Math.round(performance.now() - t0) });
  return groups;
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
  const t0 = performance.now();
  log("loadInstalledFontGroup start", { family: group.family, totalVariants: group.variants.length });
  const seen = new Set<string>();
  const loaded: { postscriptName: string; weight: string; slant: string }[] = [];
  const skipped: string[] = [];
  for (const v of group.variants) {
    const weight = deriveWeightFromStyle(v.style);
    const slant = deriveSlantFromStyle(v.style);
    const dedupKey = `${weight}:${slant}`;
    if (seen.has(dedupKey)) {
      skipped.push(`${v.postscriptName} (${dedupKey} dup)`);
      continue;
    }
    seen.add(dedupKey);
    try {
      const blob = await v.data.blob();
      const buf = await blob.arrayBuffer();
      const ff = new FontFace(group.family, buf, { style: slant, weight });
      await ff.load();
      document.fonts.add(ff);
      recordWeight(group.family, weight);
      loaded.push({ postscriptName: v.postscriptName, weight, slant });
    } catch (e) {
      warn("loadInstalledFontGroup variant failed", { family: group.family, postscriptName: v.postscriptName, error: String(e) });
    }
  }
  registeredFamilies.add(group.family);
  await document.fonts.ready;
  log("loadInstalledFontGroup done", { family: group.family, loaded, skipped, elapsedMs: Math.round(performance.now() - t0) });
}
