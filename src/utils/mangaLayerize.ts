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
    files: { panel: string; bg: string; composite: string };
    char_files: string[];
    character_ids: number[];
    text_bboxes: LayerizeBBox[];
  }>;
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
  if (window.location.hostname === 'frameplanner.example.local') {
    return 'http://example.local:5174';
  }
  const parentDomain = window.location.hostname.split('.').slice(1).join('.');
  if (parentDomain) {
    return `${window.location.protocol}//${parentDomain}`;
  }
  return window.location.origin;
}

export async function startLayerize(image: Blob, sourceRef?: string): Promise<string> {
  const fd = new FormData();
  fd.append('image', image, 'page.png');
  if (sourceRef) { fd.append('sourceRef', sourceRef); }

  const res = await fetch(`${getMangaFarmBase()}/api/manga-layerize/request`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  });

  if (res.status === 401) { throw new LayerizeError('MangaFarm にサインインしてください', 'unauthorized'); }
  if (res.status === 402) { throw new LayerizeError('Feathral 残高が不足しています', 'insufficient-feathral'); }
  if (res.status === 413) { throw new LayerizeError('画像サイズが大きすぎます (20MB 以下)', 'too-large'); }
  if (res.status === 415) { throw new LayerizeError('PNG 形式の画像のみ対応しています', 'invalid-format'); }
  if (!res.ok) { throw new LayerizeError(`request failed: HTTP ${res.status}`, 'network'); }

  const j = await res.json() as { jobId: string };
  return j.jobId;
}

export async function getLayerizeStatus(jobId: string): Promise<LayerizeStatus> {
  const res = await fetch(`${getMangaFarmBase()}/api/manga-layerize/status/${jobId}`, {
    credentials: 'include',
  });
  if (!res.ok) { throw new LayerizeError(`status failed: HTTP ${res.status}`, 'network'); }
  const j = await res.json();
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
  for (;;) {
    if (options.signal?.aborted) { throw new LayerizeError('処理を中断しました', 'aborted'); }
    const s = await getLayerizeStatus(jobId);
    options.onProgress?.(s);
    if (s.status === 'completed') { return; }
    if (s.status === 'failed') { throw new LayerizeError(s.errorMessage ?? 'failed', 'failed'); }
    await sleep(interval, options.signal);
  }
}

export async function fetchLayerizeResult(jobId: string): Promise<LayerizeResult> {
  const res = await fetch(`${getMangaFarmBase()}/api/manga-layerize/result/${jobId}`, {
    credentials: 'include',
  });
  if (!res.ok) { throw new LayerizeError(`result failed: HTTP ${res.status}`, 'network'); }
  const buf = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) { throw new LayerizeError('manifest.json が見つかりません', 'failed'); }
  const manifest: LayerizeManifest = JSON.parse(await manifestEntry.async('string'));

  const files = new Map<string, Blob>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) { continue; }
    files.set(path, await entry.async('blob'));
  }
  return { manifest, files };
}

export type LayerizePageOptions = {
  sourceRef?: string;
  signal?: AbortSignal;
  onProgress?: (status: LayerizeStatus) => void;
};

export async function layerizePage(image: Blob, options: LayerizePageOptions): Promise<LayerizeResult> {
  const jobId = await startLayerize(image, options.sourceRef);
  await pollLayerize(jobId, { signal: options.signal, onProgress: options.onProgress });
  return await fetchLayerizeResult(jobId);
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
