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
import {
  layerizePage,
  LayerizeError,
  type LayerizeFrameTreeNode,
  type LayerizeManifest,
} from './mangaLayerize';
import { waitDialog } from './waitDialog';
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

  try {
    const blob = await canvasToBlob(sourceCanvas, 'image/png');
    console.log('[manga-layerize] mangaLayerizeFilm: canvas->png blob', blob.size, 'bytes');

    // Phase 1: ダイアログ内で /detect を走らせてコマ割りを取り、ユーザーに
    // 各コマのレイヤー化モード (skip / bubble_only / full) を聞く。
    const dialogResult = await waitDialog<{
      skipPanels: number[];
      bubbleOnlyPanels: number[];
    } | null>(
      'layerizePanelSelect',
      {
        title: 'レイヤー化するコマを選択',
        imageSource: sourceCanvas,
        imageBlob: blob,
      },
    );
    if (!dialogResult) {
      console.log('[manga-layerize] cancelled by user');
      return null;
    }
    loading.set(true);

    const skipPanels = dialogResult.skipPanels ?? [];
    const bubbleOnlyPanels = dialogResult.bubbleOnlyPanels ?? [];
    console.log('[manga-layerize] skipPanels:', skipPanels, 'bubbleOnlyPanels:', bubbleOnlyPanels);
    toastStore.trigger({ message: 'ページレイヤー化を開始しました (2〜5分かかります)', timeout: 4000 });

    // Phase 2: Worker に委譲。skipPanels / bubbleOnlyPanels 込みで送ると
    // Modal が必要なコマだけ必要な深さでレイヤー化する。
    const result = await layerizePage(blob, {
      sourceRef: `frameplanner:${book.revision.id}:${sourcePage.id}`,
      skipPanels,
      bubbleOnlyPanels,
    });
    console.log('[manga-layerize] mangaLayerizeFilm: layerizePage returned, building page');

    const newPageObj = await buildLayerizedPage(result.manifest, result.files, sourcePage, film);
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

async function buildLayerizedPage(
  manifest: LayerizeManifest,
  files: Map<string, Blob>,
  sourcePage: Page,
  film: Film,
): Promise<Page> {
  // 新ページの paperSize は sourcePage と揃える。Modal の frame_tree / text_boxes は
  // 元画像 px 座標系なので、film の (n_scale, n_translation) で paper 座標系に投影する
  // (rotation は仕様により無視)。
  const paperSize: [number, number] = [sourcePage.paperSize[0], sourcePage.paperSize[1]];
  const imageSize: [number, number] = [manifest.page.width, manifest.page.height];
  const filmRect = computeFilmRectOnPaper(paperSize, imageSize, film);
  const imgToPaperScale = imageSize[0] > 0 ? filmRect.w / imageSize[0] : 1;
  console.log(
    '[manga-layerize] film rect on paper:', filmRect,
    'paper:', paperSize, 'image:', imageSize,
  );

  // Modal frame_tree の root には「画像端 → コマ bbox」の padding が cornerOffsets
  // として入っているが、 frameTree.ts の calculateOffsettedCorners は cornerOffsets を
  // 「角ごとに右下方向へ」加算するため、 padding 用途で使うと右と下にズレる(常に均等
  // padding でも topRight/bottomRight が右下に動いて結果的にはみ出す)。
  // そこで cornerOffsets は使わず、 paper にぴったり fit する frame_tree を pseudo leaf で
  // 構築する: row[ rightPad?, columnContent, leftPad? ] / column[ topPad?, inner, bottomPad? ]。
  const inner = FrameElement.compile(manifest.frame_tree);
  const modalPad = extractCornerOffsetsAsPadding(inner);
  inner.cornerOffsets = zeroCornerOffsets();

  // 各 padding を paper px で計算: paper 端 → filmRect 端の余白 + filmRect 内の
  // Modal padding (= 画像 px 比率を filmRect サイズで paper px に展開)。
  const topPad = Math.max(0, filmRect.y + modalPad.top * filmRect.h);
  const bottomPad = Math.max(0, paperSize[1] - filmRect.y - filmRect.h + modalPad.bottom * filmRect.h);
  const leftPad = Math.max(0, filmRect.x + modalPad.left * filmRect.w);
  const rightPad = Math.max(0, paperSize[0] - filmRect.x - filmRect.w + modalPad.right * filmRect.w);
  const middleW = Math.max(1, paperSize[0] - leftPad - rightPad);
  const middleH = Math.max(1, paperSize[1] - topPad - bottomPad);
  console.log(
    '[manga-layerize] paddings (paper px) top/right/bottom/left:',
    topPad, rightPad, bottomPad, leftPad,
    'middle:', middleW, middleH,
  );

  const root = wrapWithPaddings(inner, { top: topPad, right: rightPad, bottom: bottomPad, left: leftPad }, { w: middleW, h: middleH });

  // attachLeafContent は inner を起点に再帰し、 pseudo leaf は skip する。
  // tree のレイアウト計算は新 root から行う必要があるので root を渡す。
  await attachLeafContent(inner, manifest.frame_tree, manifest, files, paperSize, root);

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
    bubbles.push(makeBubbleFromTextBox(tb, paperSize, filmRect, imgToPaperScale));
  }

  const page = newPage(root, bubbles);
  page.paperSize = paperSize;
  page.paperColor = '#ffffff';
  page.frameColor = '#000000';
  page.frameWidth = 2;
  return page;
}

type FilmRectOnPaper = { x: number; y: number; w: number; h: number };

function computeFilmRectOnPaper(
  paperSize: [number, number],
  imageSize: [number, number],
  film: Film,
): FilmRectOnPaper {
  // Film.getShiftedRect は paper 中心を原点とした矩形を返すので、paper 絶対座標に直す
  const r = Film.getShiftedRect(paperSize, imageSize, film.n_scale, film.n_translation, 0);
  return {
    x: r[0] + paperSize[0] / 2,
    y: r[1] + paperSize[1] / 2,
    w: r[2],
    h: r[3],
  };
}

function zeroCornerOffsets() {
  return {
    topLeft: [0, 0] as [number, number],
    topRight: [0, 0] as [number, number],
    bottomLeft: [0, 0] as [number, number],
    bottomRight: [0, 0] as [number, number],
  };
}

function extractCornerOffsetsAsPadding(elem: FrameElement): { left: number; top: number; right: number; bottom: number } {
  // Modal が markUp.padding で設定した cornerOffsets は均等 padding なので
  // 1 隅から 4 値を取り出せば十分。
  return {
    left: elem.cornerOffsets.topLeft[0],
    top: elem.cornerOffsets.topLeft[1],
    right: elem.cornerOffsets.topRight[0],
    bottom: elem.cornerOffsets.bottomLeft[1],
  };
}

function makePseudoLeaf(rawSize: number): FrameElement {
  const elem = new FrameElement(rawSize);
  elem.pseudo = true;
  elem.visibility = 0;
  return elem;
}

function wrapWithPaddings(
  inner: FrameElement,
  pad: { top: number; right: number; bottom: number; left: number },
  middle: { w: number; h: number },
): FrameElement {
  // inner を中央 (column) に置き、上下左右に pseudo leaf で padding を表現。
  // direction='h' は右→左の読み順なので row.children は [right, middle, left] の順。
  let columnContent: FrameElement;
  if (inner.direction === 'v') {
    // inner 自体が縦 column なので children に直接 padding を挿入
    inner.children = [
      ...(pad.top > 0 ? [makePseudoLeaf(pad.top)] : []),
      ...inner.children,
      ...(pad.bottom > 0 ? [makePseudoLeaf(pad.bottom)] : []),
    ];
    inner.rawSize = middle.w;
    inner.calculateLengthAndBreadth();
    columnContent = inner;
  } else {
    // direction='h' or null (leaf) は column wrapper で包む
    inner.rawSize = middle.h;
    inner.calculateLengthAndBreadth();
    columnContent = new FrameElement(middle.w);
    columnContent.direction = 'v';
    columnContent.children = [
      ...(pad.top > 0 ? [makePseudoLeaf(pad.top)] : []),
      inner,
      ...(pad.bottom > 0 ? [makePseudoLeaf(pad.bottom)] : []),
    ];
    columnContent.calculateLengthAndBreadth();
  }

  const root = new FrameElement(1);
  root.direction = 'h';
  root.children = [
    ...(pad.right > 0 ? [makePseudoLeaf(pad.right)] : []),
    columnContent,
    ...(pad.left > 0 ? [makePseudoLeaf(pad.left)] : []),
  ];
  root.calculateLengthAndBreadth();
  return root;
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
  let markIdx = 0;
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    // wrapWithPaddings で挿入した pseudo leaf は manifest 側に対応物が無いので skip
    if (child.pseudo) continue;
    const childMark = childMarks[markIdx];
    markIdx++;
    if (!childMark) {
      console.warn('manga-layerize: child markup missing at', i);
      continue;
    }
    await attachLeafContent(child, childMark, manifest, files, paperSize, treeRoot);
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

function makeBubbleFromTextBox(
  tb: ManifestTextBox,
  paperSize: [number, number],
  filmRect: FilmRectOnPaper,
  imgToPaperScale: number,
): Bubble {
  // text_box の座標は元画像 px 系。film の paper 上配置に合わせて変換する。
  const { x0, y0, x1, y1 } = tb.box_2d;
  const cx = filmRect.x + (x0 + x1) * 0.5 * imgToPaperScale;
  const cy = filmRect.y + (y0 + y1) * 0.5 * imgToPaperScale;
  const w = Math.abs(x1 - x0) * imgToPaperScale * BUBBLE_SIZE_SCALE;
  const h = Math.abs(y1 - y0) * imgToPaperScale * BUBBLE_SIZE_SCALE;
  const fontSize = tb.char_height * imgToPaperScale;

  const bubble = new Bubble();
  bubble.text = normalizeBubbleText(tb.text);
  bubble.shape = tb.shape ?? 'ellipse';
  bubble.initOptions();
  bubble.direction = tb.orientation === 'vertical' ? 'v' : 'h';
  bubble.fillColor = '#ffffff';
  bubble.setPhysicalCenter(paperSize, [cx, cy]);
  bubble.setPhysicalSize(paperSize, Bubble.enoughSize([w, h]));
  bubble.setPhysicalFontSize(paperSize, Math.max(10, fontSize));
  return bubble;
}

// OCR が中黒の連続として返してくる箇所を三点リーダに正規化する (3 個 ≒ 1 個の …)
function normalizeBubbleText(text: string): string {
  return text.replace(/[･・]{2,}/g, (m) => '…'.repeat(Math.max(1, Math.round(m.length / 3))));
}
