import JSZip from 'jszip';

export type LayerizeBBox = [number, number, number, number];

export type LayerizeFrameTreeNode = {
  panel?: number;
  size?: number;
  divider?: { spacing?: number; slant?: number };
  row?: LayerizeFrameTreeNode[];
  column?: LayerizeFrameTreeNode[];
  padding?: { left?: number; top?: number; right?: number; bottom?: number };
  _unsplittable?: boolean;
};

export type LayerizeManifest = {
  version: number;
  schema: string;
  page: { width: number; height: number; source_filename: string | null };
  files: { clean_page: string; background: string; stacked: string };
  detections: Array<{
    label: 0 | 1 | 2;
    class_name: 'body' | 'text' | 'frame';
    score: number;
    bbox: LayerizeBBox;
  }>;
  frames: Array<{ index: number; reading_order_rank: number; bbox: LayerizeBBox }>;
  characters: Array<{
    id: number;
    panel: number | null;
    body_bbox: LayerizeBBox | null;
    alpha_bbox: LayerizeBBox | null;
    alpha_centroid: [number, number] | null;
    files: { page_layer: string };
  }>;
  frame_tree: LayerizeFrameTreeNode;
  panels: Array<{
    index: number;
    frame_bbox: LayerizeBBox;
    size: [number, number];
    /** @deprecated true only when mode === 'skip'. Prefer `mode`. */
    skipped?: boolean;
    /** Per-panel layerize mode chosen by the user.
     *  - 'skip': not layerized (bg = original crop, no char/bubble extraction)
     *  - 'bubble_only': bubble removed + char baked into bg, bubbles emitted
     *  - 'full': bubble removed + char separated, bubbles emitted */
    mode: 'skip' | 'bubble_only' | 'full';
    files: { panel: string; bg: string; composite: string };
    char_files: string[];
    character_ids: number[];
    text_bboxes: LayerizeBBox[];
  }>;
  /** Bubble text + bbox + orientation extracted by Cloud Vision + Gemini on the
   *  ORIGINAL page. Coordinates are in page-pixel space (same as `page.width`/
   *  `page.height`). May be empty if extraction failed or the page has no text. */
  text_boxes?: Array<{
    box_2d: { x0: number; y0: number; x1: number; y1: number };
    text: string;
    char_height: number;
    orientation: 'horizontal' | 'vertical';
    /** Bubble outline classified by Gemini. May be absent on older Workers — fall back to 'ellipse'. */
    shape?: 'ellipse' | 'rounded' | 'square' | 'polygon' | 'soft' | 'shout' | 'thought' | 'none';
  }>;
  /** Per-step wall durations and estimated USD cost. Filled in by the Worker
   *  (Modal compute time isn't observable from there — see `missing`). */
  metrics?: {
    total_duration_ms: number;
    steps: Array<{ name: string; duration_ms: number }>;
    cost_usd_estimated: {
      total: number;
      breakdown: Array<{ name: string; usd: number; note: string }>;
      missing: string[];
      pricing_as_of: string;
    };
  };
};

export type LayerizeResult = {
  manifest: LayerizeManifest;
  files: Map<string, Blob>;
};

export type LayerizeStatus = {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
};

export class LayerizeError extends Error {
  constructor(message: string, readonly code: 'unauthorized' | 'insufficient-feathral' | 'too-large' | 'invalid-format' | 'failed' | 'aborted' | 'network') {
    super(message);
  }
}

function getMangaFarmBase(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const hostname = window.location.hostname;
  let base: string;
  if (hostname === 'frameplanner.example.local') {
    base = 'https://example.local:5174';
  } else {
    const parentDomain = hostname.split('.').slice(1).join('.');
    base = parentDomain
      ? `${window.location.protocol}//${parentDomain}`
      : window.location.origin;
  }
  console.log('[manga-layerize] getMangaFarmBase: hostname', hostname, '-> base', base);
  return base;
}

const START_LAYERIZE_TIMEOUT_MS = 30_000;

function explainFetchFailure(targetUrl: string, e: unknown): void {
  const msg = (e as Error)?.message ?? String(e);
  console.error('[manga-layerize] startLayerize: fetch failed —', msg, e);

  const pageProto = typeof window !== 'undefined' ? window.location.protocol : '';
  let target: URL | null = null;
  try { target = new URL(targetUrl); } catch { /* ignore */ }
  const targetProto = target?.protocol ?? '';

  console.error('[manga-layerize] 失敗の原因として考えられるもの:');

  // よくある失敗ケースを順に説明
  if (pageProto === 'https:' && targetProto === 'http:') {
    console.error(
      '  • Mixed content: HTTPS のページから HTTP のリクエストはブラウザが弾きます。\n' +
      '    対象 URL を https:// にするか、FramePlanner を HTTP で起動してください。'
    );
  }
  if (pageProto === 'https:' && targetProto === 'https:' && target?.hostname === 'example.local') {
    console.error(
      '  • dev: MangaFarm が HTTPS で起動していない可能性。\n' +
      '    MangaFarm 側で `npm run dev-https` を実行して起動し直してください\n' +
      '    (`npm run dev` は HTTP のため、HTTPS の FramePlanner からは fetch できません)。'
    );
  }
  if (pageProto === 'http:' && targetProto === 'https:') {
    console.error(
      '  • dev: FramePlanner は HTTP なのに MangaFarm が HTTPS で待ち受けている可能性。\n' +
      '    MangaFarm を `npm run dev` (HTTP) で起動するか、両方とも HTTPS に揃えてください。'
    );
  }
  console.error(
    '  • CORS: MangaFarm 側のレスポンスに Access-Control-Allow-Origin が無いか、\n' +
    '    Origin が許可リストに含まれていない (MangaFarm `hooks.server.ts` の CORS_ALLOWED_DOMAINS を確認)。'
  );
  console.error(
    '  • サーバ未起動 / ポート不一致: MangaFarm dev サーバが起動していない、\n' +
    '    または ' + (target?.host ?? targetUrl) + ' に到達できない。'
  );
  console.error(
    '  • 自己署名証明書未信頼: HTTPS の場合、mkcert の CA がブラウザに信頼されていない可能性。\n' +
    '    一度 `' + targetUrl.replace(/\/api\/.*/, '/') + '` を直接ブラウザで開いて警告が出ないか確認。'
  );
  console.error('[manga-layerize] DevTools Network タブも併せて見てください。');
}


export async function startLayerize(
  image: Blob,
  sourceRef?: string,
  skipPanels?: number[],
  bubbleOnlyPanels?: number[],
): Promise<string> {
  const fd = new FormData();
  fd.append('image', image, 'page.png');
  if (sourceRef) { fd.append('sourceRef', sourceRef); }
  if (skipPanels && skipPanels.length > 0) {
    fd.append('skipPanels', JSON.stringify(skipPanels));
  }
  if (bubbleOnlyPanels && bubbleOnlyPanels.length > 0) {
    fd.append('bubbleOnlyPanels', JSON.stringify(bubbleOnlyPanels));
  }

  const url = `${getMangaFarmBase()}/api/manga-layerize/request`;
  console.log('[manga-layerize] startLayerize: POST', url, 'image size:', image.size, 'sourceRef:', sourceRef);

  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    console.warn('[manga-layerize] startLayerize: timeout after', START_LAYERIZE_TIMEOUT_MS, 'ms — aborting');
    ctrl.abort();
  }, START_LAYERIZE_TIMEOUT_MS);

  let res: Response;
  const t0 = performance.now();
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: fd,
      signal: ctrl.signal,
    });
  } catch (e) {
    const elapsed = Math.round(performance.now() - t0);
    if ((e as any)?.name === 'AbortError') {
      console.error('[manga-layerize] startLayerize: aborted by timeout after', elapsed, 'ms', e);
      throw new LayerizeError(`リクエストがタイムアウトしました (${Math.round(START_LAYERIZE_TIMEOUT_MS / 1000)}秒)`, 'network');
    }
    explainFetchFailure(url, e);
    throw new LayerizeError(`ネットワークエラー: ${(e as Error)?.message ?? String(e)}`, 'network');
  } finally {
    clearTimeout(timer);
  }

  const elapsed = Math.round(performance.now() - t0);
  console.log('[manga-layerize] startLayerize: response status', res.status, 'in', elapsed, 'ms');

  if (res.status === 401) { throw new LayerizeError('MangaFarm にサインインしてください', 'unauthorized'); }
  if (res.status === 402) { throw new LayerizeError('Feathral 残高が不足しています', 'insufficient-feathral'); }
  if (res.status === 413) { throw new LayerizeError('画像サイズが大きすぎます (20MB 以下)', 'too-large'); }
  if (res.status === 415) { throw new LayerizeError('PNG 形式の画像のみ対応しています', 'invalid-format'); }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[manga-layerize] startLayerize: non-OK body', body);
    if (res.status >= 500) {
      console.error('[manga-layerize] サーバ側エラー (5xx)。MangaFarm のサーバログ (例: vite dev のターミナル) を確認してください。');
    }
    throw new LayerizeError(`request failed: HTTP ${res.status}`, 'network');
  }

  let j: { jobId: string };
  try {
    j = await res.json() as { jobId: string };
  } catch (e) {
    console.error('[manga-layerize] startLayerize: invalid JSON response', e);
    throw new LayerizeError('レスポンスの解析に失敗しました', 'failed');
  }
  if (!j?.jobId) {
    console.error('[manga-layerize] startLayerize: missing jobId in response', j);
    throw new LayerizeError('jobId が返ってきませんでした', 'failed');
  }
  console.log('[manga-layerize] startLayerize: jobId', j.jobId);
  return j.jobId;
}

export async function getLayerizeStatus(jobId: string): Promise<LayerizeStatus> {
  const url = `${getMangaFarmBase()}/api/manga-layerize/status/${jobId}`;
  const res = await fetch(url, {
    credentials: 'include',
  });
  if (!res.ok) {
    console.warn('[manga-layerize] getLayerizeStatus: HTTP', res.status, 'jobId', jobId);
    throw new LayerizeError(`status failed: HTTP ${res.status}`, 'network');
  }
  const j = await res.json();
  console.log('[manga-layerize] getLayerizeStatus:', { jobId: j.jobId, status: j.status, errorMessage: j.errorMessage ?? null });
  return {
    jobId: j.jobId,
    status: j.status,
    errorMessage: j.errorMessage ?? null,
  };
}

export type PollOptions = {
  signal?: AbortSignal;
  intervalMs?: number;
  onProgress?: (status: LayerizeStatus) => void;
};

export async function pollLayerize(jobId: string, options: PollOptions): Promise<void> {
  const interval = options.intervalMs ?? 3000;
  console.log('[manga-layerize] pollLayerize: start jobId', jobId, 'interval', interval);
  let tick = 0;
  for (;;) {
    if (options.signal?.aborted) { throw new LayerizeError('処理を中断しました', 'aborted'); }
    tick++;
    const s = await getLayerizeStatus(jobId);
    console.log('[manga-layerize] pollLayerize: tick', tick, 'status', s.status);
    options.onProgress?.(s);
    if (s.status === 'completed') {
      console.log('[manga-layerize] pollLayerize: completed after', tick, 'ticks');
      return;
    }
    if (s.status === 'failed') { throw new LayerizeError(s.errorMessage ?? 'failed', 'failed'); }
    await sleep(interval, options.signal);
  }
}

export async function fetchLayerizeResult(jobId: string): Promise<LayerizeResult> {
  const url = `${getMangaFarmBase()}/api/manga-layerize/result/${jobId}`;
  console.log('[manga-layerize] fetchLayerizeResult: GET', url);
  const res = await fetch(url, {
    credentials: 'include',
  });
  console.log('[manga-layerize] fetchLayerizeResult: response status', res.status);
  if (!res.ok) { throw new LayerizeError(`result failed: HTTP ${res.status}`, 'network'); }
  const buf = await res.arrayBuffer();
  console.log('[manga-layerize] fetchLayerizeResult: zip bytes', buf.byteLength);
  const zip = await JSZip.loadAsync(buf);

  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) { throw new LayerizeError('manifest.json が見つかりません', 'failed'); }
  const manifest: LayerizeManifest = JSON.parse(await manifestEntry.async('string'));
  console.log('[manga-layerize] fetchLayerizeResult: manifest', manifest);

  const files = new Map<string, Blob>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) { continue; }
    files.set(path, await entry.async('blob'));
  }
  console.log('[manga-layerize] fetchLayerizeResult: extracted files', files.size);
  return { manifest, files };
}

export type LayerizePageOptions = {
  sourceRef?: string;
  signal?: AbortSignal;
  onProgress?: (status: LayerizeStatus) => void;
  /** 1-based reading-order panel indices to leave un-layerized (panel-cropped
   *  from the original page only, no bg / chars / bubbles). */
  skipPanels?: number[];
  /** 1-based reading-order panel indices to layerize as bubble-only (bubble
   *  removed + char baked into bg, bubbles emitted, no char separation).
   *  Must be disjoint from `skipPanels`. */
  bubbleOnlyPanels?: number[];
};

export async function layerizePage(image: Blob, options: LayerizePageOptions): Promise<LayerizeResult> {
  console.log('[manga-layerize] layerizePage: begin',
    'skipPanels=', options.skipPanels,
    'bubbleOnlyPanels=', options.bubbleOnlyPanels);
  const jobId = await startLayerize(image, options.sourceRef, options.skipPanels, options.bubbleOnlyPanels);
  await pollLayerize(jobId, { signal: options.signal, onProgress: options.onProgress });
  const result = await fetchLayerizeResult(jobId);
  console.log('[manga-layerize] layerizePage: done jobId', jobId);
  return result;
}

export type DetectFrame = {
  /** 1-based reading-order index. */
  index: number;
  bbox: LayerizeBBox;
};

export type DetectPanelsResult = {
  pageWidth: number;
  pageHeight: number;
  frames: DetectFrame[];
};

const DETECT_TIMEOUT_MS = 60_000;

/** Phase 1 of layerize: ask Modal /detect (via MangaFarm) for the page's frame
 *  layout so the FramePlanner panel-select dialog can preview each panel and
 *  let the user decide which ones to skip. */
export async function detectPanels(image: Blob): Promise<DetectPanelsResult> {
  const fd = new FormData();
  fd.append('image', image, 'page.png');

  const url = `${getMangaFarmBase()}/api/manga-layerize/detect`;
  console.log('[manga-layerize] detectPanels: POST', url, 'image size:', image.size);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DETECT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', credentials: 'include', body: fd, signal: ctrl.signal });
  } catch (e) {
    if ((e as any)?.name === 'AbortError') {
      throw new LayerizeError(`検出がタイムアウトしました (${Math.round(DETECT_TIMEOUT_MS / 1000)}秒)`, 'network');
    }
    explainFetchFailure(url, e);
    throw new LayerizeError(`ネットワークエラー: ${(e as Error)?.message ?? String(e)}`, 'network');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) throw new LayerizeError('MangaFarm にサインインしてください', 'unauthorized');
  if (res.status === 413) throw new LayerizeError('画像サイズが大きすぎます (20MB 以下)', 'too-large');
  if (res.status === 415) throw new LayerizeError('PNG 形式の画像のみ対応しています', 'invalid-format');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[manga-layerize] detectPanels: non-OK body', body);
    throw new LayerizeError(`detect failed: HTTP ${res.status}`, 'network');
  }
  const data = await res.json() as {
    width: number;
    height: number;
    detections: Array<{ label: number; class_name: string; score: number; bbox: LayerizeBBox }>;
  };
  // Reading-order is computed Modal-side too, but only inside /group_panels.
  // Replicate it here (right→left, top→bottom for Japanese manga) so the
  // user-facing panel index in the dialog matches manifest.frames[].index later.
  const rawFrames = data.detections
    .filter((d) => d.label === 2)
    .map((d) => d.bbox);
  const ordered = readingOrder(rawFrames);
  return {
    pageWidth: data.width,
    pageHeight: data.height,
    frames: ordered.map((bbox, i) => ({ index: i + 1, bbox })),
  };
}

/** Right→left, top→bottom (Japanese manga) — same algorithm Modal uses. */
function readingOrder(frames: LayerizeBBox[]): LayerizeBBox[] {
  if (frames.length === 0) return [];
  const band = Math.min(...frames.map((b) => b[3] - b[1])) * 0.5;
  const indexed = frames.map((bbox, i) => ({ bbox, i }));
  indexed.sort((a, b) => a.bbox[1] - b.bbox[1]);
  const rows: { bbox: LayerizeBBox; i: number }[][] = [];
  for (const item of indexed) {
    const cy = (item.bbox[1] + item.bbox[3]) / 2;
    let placed = false;
    for (const row of rows) {
      const rowCy = row.reduce((acc, r) => acc + (r.bbox[1] + r.bbox[3]) / 2, 0) / row.length;
      if (Math.abs(cy - rowCy) < band) {
        row.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([item]);
  }
  const out: LayerizeBBox[] = [];
  for (const row of rows) {
    row.sort((a, b) => -((a.bbox[0] + a.bbox[2]) / 2) + ((b.bbox[0] + b.bbox[2]) / 2));
    for (const r of row) out.push(r.bbox);
  }
  return out;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new LayerizeError('aborted', 'aborted')); return; }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new LayerizeError('aborted', 'aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
