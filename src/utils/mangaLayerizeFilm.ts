import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { FrameElement, insertFrameLayers } from '../lib/layeredCanvas/dataModels/frameTree';
import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import { newPage, type Page } from '../lib/book/book';
import { canvasToBlob, createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
import { loading } from './loadingStore';
import { requireSignIn } from './signInPrompt';
import { analyticsEvent } from './analyticsEvent';
import { layerizePage, LayerizeError, type LayerizeFrameTreeNode, type LayerizeManifest } from './mangaLayerize';
import { mainBook } from '../bookeditor/workspaceStore';

export type MangaLayerizeResult = {
  page: Page;
  insertIndex: number;
} | null;

export async function mangaLayerizeFilm(sourcePage: Page, film: Film): Promise<MangaLayerizeResult> {
  console.log('[manga-layerize] mangaLayerizeFilm: enter, sourcePage.id', sourcePage.id);
  if (!await requireSignIn('ページレイヤー化はサインインしてないと使えません')) {
    console.log('[manga-layerize] mangaLayerizeFilm: aborted (not signed in)');
    return null;
  }

  if (film.content.kind !== 'media' || !(film.content.media instanceof ImageMedia)) {
    console.log('[manga-layerize] mangaLayerizeFilm: aborted (not an image media)');
    toastStore.trigger({ message: 'ページレイヤー化は画像のみ使えます', timeout: 3000 });
    return null;
  }
  const sourceCanvas = (film.content.media as ImageMedia).drawSource;
  console.log('[manga-layerize] mangaLayerizeFilm: source canvas', sourceCanvas.width, 'x', sourceCanvas.height);

  const book = get(mainBook);
  if (!book) {
    console.warn('[manga-layerize] mangaLayerizeFilm: aborted (no main book)');
    toastStore.trigger({ message: 'Book が見つかりません', timeout: 3000 });
    return null;
  }
  const sourceIndex = book.pages.indexOf(sourcePage);
  if (sourceIndex < 0) {
    console.warn('[manga-layerize] mangaLayerizeFilm: aborted (sourcePage not in book)');
    toastStore.trigger({ message: 'ページの位置が特定できません', timeout: 3000 });
    return null;
  }

  loading.set(true);
  console.log('[manga-layerize] mangaLayerizeFilm: loading=true');
  try {
    const blob = await canvasToBlob(sourceCanvas, 'image/png');
    console.log('[manga-layerize] mangaLayerizeFilm: canvas->png blob', blob.size, 'bytes');
    toastStore.trigger({ message: 'ページレイヤー化を開始しました (2〜5分かかります)', timeout: 4000 });

    const result = await layerizePage(blob, {
      sourceRef: `frameplanner:${book.revision.id}:${sourcePage.id}`,
    });
    console.log('[manga-layerize] mangaLayerizeFilm: layerizePage returned, building page');

    const newPageObj = await buildLayerizedPage(result.manifest, result.files);
    console.log('[manga-layerize] mangaLayerizeFilm: buildLayerizedPage done');

    const insertIndex = sourceIndex + 1;
    book.pages.splice(insertIndex, 0, newPageObj);

    analyticsEvent('manga-layerize');
    toastStore.trigger({ message: 'ページレイヤー化が完了しました', timeout: 3000 });
    console.log('[manga-layerize] mangaLayerizeFilm: completed, insertIndex', insertIndex);
    return { page: newPageObj, insertIndex };
  } catch (e) {
    handleLayerizeError(e);
    return null;
  } finally {
    loading.set(false);
    console.log('[manga-layerize] mangaLayerizeFilm: loading=false');
  }
}

function handleLayerizeError(e: unknown): void {
  if (e instanceof LayerizeError) {
    console.error('[manga-layerize] failed:', e.code, '-', e.message);
    toastStore.trigger({ message: e.message, timeout: 5000 });
    return;
  }
  console.error('[manga-layerize] failed with unexpected error:', e);
  console.error('[manga-layerize] LayerizeError ではない例外です。manifest 解釈や buildLayerizedPage 内の問題が疑われます。スタックトレースを確認してください。');
  toastStore.trigger({ message: 'ページレイヤー化に失敗しました', timeout: 5000 });
}

async function buildLayerizedPage(manifest: LayerizeManifest, files: Map<string, Blob>): Promise<Page> {
  const paperSize: [number, number] = [manifest.page.width, manifest.page.height];

  // manifest.frame_tree をそのままコンパイル (panel フィールドは markUp 上にだけ残る)
  const frameTree = FrameElement.compile(manifest.frame_tree);

  // 葉ノードに panel-cropped 素材 (bg + 各キャラ) を流し込む
  await attachLeafContent(frameTree, manifest.frame_tree, manifest, files, paperSize);

  // フキダシは Worker 側で抽出済みの text_boxes (Cloud Vision + Gemini) を
  // そのまま使う。manifest.panels[].text_bboxes (Modal の text class 検出) は
  // bbox しか無いので使わない。
  const textBoxes = manifest.text_boxes ?? [];
  console.log('[manga-layerize] text_boxes count:', textBoxes.length);
  for (const tb of textBoxes) {
    console.log('[manga-layerize] text_box:', {
      text: tb.text,
      orientation: tb.orientation,
      char_height: tb.char_height,
      box_2d: tb.box_2d,
    });
  }
  const bubbles: Bubble[] = [];
  for (const tb of textBoxes) {
    bubbles.push(makeBubbleFromTextBox(tb, paperSize));
  }

  const page = newPage(frameTree, bubbles);
  page.paperSize = paperSize;
  page.paperColor = '#ffffff';
  page.frameColor = '#000000';
  page.frameWidth = 2;
  return page;
}

async function attachLeafContent(
  el: FrameElement,
  node: LayerizeFrameTreeNode,
  manifest: LayerizeManifest,
  files: Map<string, Blob>,
  paperSize: [number, number],
  root?: FrameElement,
): Promise<void> {
  const treeRoot = root ?? el;
  if (!el.direction) {
    const panelIdx = node.panel;
    if (panelIdx == null) {
      console.warn('manga-layerize: leaf without panel index', node);
      return;
    }
    const panel = manifest.panels.find(p => p.index === panelIdx);
    if (!panel) {
      console.warn('manga-layerize: panel not found for index', panelIdx);
      return;
    }

    const films: Film[] = [];
    const bgBlob = files.get(panel.files.bg);
    if (bgBlob) {
      films.push(await blobToFilm(bgBlob));
    } else {
      console.warn('manga-layerize: panel bg missing', panel.files.bg);
    }
    for (const charPath of panel.char_files) {
      const blob = files.get(charPath);
      if (!blob) {
        console.warn('manga-layerize: panel character missing', charPath);
        continue;
      }
      films.push(await blobToFilm(blob));
    }

    if (films.length > 0) {
      // 葉フレームの bbox に bg + chars を一括フィット
      insertFrameLayers(treeRoot, paperSize, el, 0, films);
      // panel-cropped 画像にはコマ枠線が混入していることがあるので
      // 中心固定のまま少し拡大して枠線を切り落とす
      for (const film of films) {
        film.n_scale *= PANEL_LAYER_SCALE;
      }
    }
    return;
  }

  const childMarks = node.row ?? node.column ?? [];
  for (let i = 0; i < el.children.length; i++) {
    const childMark = childMarks[i];
    if (!childMark) {
      console.warn('manga-layerize: child markup missing at', i);
      continue;
    }
    await attachLeafContent(el.children[i], childMark, manifest, files, paperSize, treeRoot);
  }
}

async function blobToFilm(blob: Blob): Promise<Film> {
  const canvas = await createCanvasFromBlob(blob);
  return Film.fromMedia(new ImageMedia(canvas));
}

type ManifestTextBox = NonNullable<LayerizeManifest['text_boxes']>[number];

// 認識領域は文字だけのタイトな bbox なので、フキダシらしい余白を持たせるために膨らませる
const BUBBLE_SIZE_SCALE = 1.45;

// panel-cropped 画像 (bg / characters) には元のコマ枠線が含まれることがあるので、
// 中心固定で少し拡大して枠線をフレームクリップ外に追い出す
const PANEL_LAYER_SCALE = 1.01;

function makeBubbleFromTextBox(tb: ManifestTextBox, paperSize: [number, number]): Bubble {
  const { x0, y0, x1, y1 } = tb.box_2d;
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const w = Math.abs(x1 - x0) * BUBBLE_SIZE_SCALE;
  const h = Math.abs(y1 - y0) * BUBBLE_SIZE_SCALE;

  const bubble = new Bubble();
  bubble.text = normalizeBubbleText(tb.text);
  bubble.shape = tb.shape ?? 'ellipse';
  bubble.initOptions();
  bubble.direction = tb.orientation === 'vertical' ? 'v' : 'h';
  bubble.fillColor = '#ffffff';
  bubble.setPhysicalCenter(paperSize, [cx, cy]);
  bubble.setPhysicalSize(paperSize, Bubble.enoughSize([w, h]));
  bubble.setPhysicalFontSize(paperSize, Math.max(10, tb.char_height));
  return bubble;
}

// OCR が中黒の連続として返してくる箇所を三点リーダに正規化する (3 個 ≒ 1 個の …)
function normalizeBubbleText(text: string): string {
  return text.replace(/[･・]{2,}/g, (m) => '…'.repeat(Math.max(1, Math.round(m.length / 3))));
}
