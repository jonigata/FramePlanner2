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
  if (!await requireSignIn('ページレイヤー化はサインインしてないと使えません')) {
    return null;
  }

  if (film.content.kind !== 'media' || !(film.content.media instanceof ImageMedia)) {
    toastStore.trigger({ message: 'ページレイヤー化は画像のみ使えます', timeout: 3000 });
    return null;
  }
  const sourceCanvas = (film.content.media as ImageMedia).drawSource;

  const book = get(mainBook);
  if (!book) {
    toastStore.trigger({ message: 'Book が見つかりません', timeout: 3000 });
    return null;
  }
  const sourceIndex = book.pages.indexOf(sourcePage);
  if (sourceIndex < 0) {
    toastStore.trigger({ message: 'ページの位置が特定できません', timeout: 3000 });
    return null;
  }

  loading.set(true);
  try {
    const blob = await canvasToBlob(sourceCanvas, 'image/png');
    toastStore.trigger({ message: 'ページレイヤー化を開始しました (2〜5分かかります)', timeout: 4000 });

    const result = await layerizePage(blob, {
      sourceRef: `frameplanner:${book.revision.id}:${sourcePage.id}`,
    });

    const newPageObj = await buildLayerizedPage(result.manifest, result.files);

    const insertIndex = sourceIndex + 1;
    book.pages.splice(insertIndex, 0, newPageObj);

    analyticsEvent('manga-layerize');
    toastStore.trigger({ message: 'ページレイヤー化が完了しました', timeout: 3000 });
    return { page: newPageObj, insertIndex };
  } catch (e) {
    handleLayerizeError(e);
    return null;
  } finally {
    loading.set(false);
  }
}

function handleLayerizeError(e: unknown): void {
  console.error('manga-layerize failed', e);
  if (e instanceof LayerizeError) {
    toastStore.trigger({ message: e.message, timeout: 5000 });
    return;
  }
  toastStore.trigger({ message: 'ページレイヤー化に失敗しました', timeout: 5000 });
}

async function buildLayerizedPage(manifest: LayerizeManifest, files: Map<string, Blob>): Promise<Page> {
  const paperSize: [number, number] = [manifest.page.width, manifest.page.height];

  // manifest.frame_tree をそのままコンパイル (panel フィールドは markUp 上にだけ残る)
  const frameTree = FrameElement.compile(manifest.frame_tree);

  // 葉ノードに panel-cropped 素材 (bg + 各キャラ) を流し込む
  await attachLeafContent(frameTree, manifest.frame_tree, manifest, files, paperSize);

  // フキダシは text_bboxes をページ座標系のままプレースホルダで配置
  const bubbles: Bubble[] = [];
  for (const panel of manifest.panels) {
    for (const tb of panel.text_bboxes) {
      bubbles.push(makePlaceholderBubble(tb, paperSize));
    }
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

function makePlaceholderBubble(bbox: [number, number, number, number], paperSize: [number, number]): Bubble {
  const [x0, y0, x1, y1] = bbox;
  const cx = (x0 + x1) * 0.5;
  const cy = (y0 + y1) * 0.5;
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);

  const bubble = new Bubble();
  bubble.text = '';
  bubble.shape = 'ellipse';
  bubble.initOptions();
  bubble.direction = h >= w ? 'v' : 'h';
  bubble.fillColor = '#ffffff';
  bubble.setPhysicalCenter(paperSize, [cx, cy]);
  bubble.setPhysicalSize(paperSize, Bubble.enoughSize([w, h]));
  return bubble;
}
