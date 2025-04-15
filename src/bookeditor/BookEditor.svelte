<script lang="ts">
  import { derived } from 'svelte/store';
  import { onDestroy } from 'svelte';
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { FrameElement, calculatePhysicalLayout, findLayoutOf, type Border, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia, buildMedia } from '../lib/layeredCanvas/dataModels/media';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { bubbleInspectorTarget, bubbleSplitCursor, bubbleInspectorRebuildToken, type BubbleInspectorTarget, setBubbleCommandTools } from './bubbleinspector/bubbleInspectorStore';
  import { frameInspectorTarget, frameInspectorRebuildToken, type FrameInspectorTarget, setFrameCommandTools } from './frameinspector/frameInspectorStore';
  import type { Book, Page, BookOperators, HistoryTag, ReadingDirection, WrapMode } from '../lib/book/book';
  import { clonePage, undoBookHistory, redoBookHistory, commitBook, revertBook, collectBookContents, dealBookContents, swapBookContents } from '../lib/book/book';
  import { mainBook, bookEditor, viewport, redrawToken, undoToken, insertNewPageToBook } from './bookStore';
  import { buildBookEditor, getFoldAndGapFromWrapMode, getDirectionFromReadingDirection } from './bookEditorUtils';
  import AutoSizeCanvas from '../utils/AutoSizeCanvas.svelte';
  import { BubbleLayer, DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
  import Painter from '../painter/Painter.svelte';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import ImageProvider from '../generator/ImageProvider.svelte';
  import { loading } from '../utils/loadingStore'
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { batchImagingPage } from '../generator/batchImagingStore';
  import { copyToClipboard } from '../utils/saver/copyToClipboard';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { analyticsEvent } from "../utils/analyticsEvent";
  import { bubbleBucketPage, bubbleBucketDirty } from '../bubbleBucket/bubbleBucketStore';
  import { minimumBoundingScale } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { triggerTemplateChoice } from "./templateChooserStore";
  import { pageInspectorTarget } from "./pageinspector/pageInspectorStore";
  import type { FocusKeeper } from "../lib/layeredCanvas/tools/focusKeeper";
  import { trapezoidBoundingRect } from "../lib/layeredCanvas/tools/geometry/trapezoid";
  import { DelayedCommiterGroup } from '../utils/delayedCommiter';
  import { punchFilm } from '../utils/punchImage'
  import { upscaleFilm } from '../utils/upscaleImage'
  import { outPaintFilm, calculateFramePadding } from '../utils/outPaintFilm'
  import { onlineStatus } from "../utils/accountStore";
  // import { tryOutToken } from '../utils/tryOutStore';
  import { generateMovie } from '../utils/generateMovie';
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import { FilmStackTransformer } from "../lib/layeredCanvas/dataModels/film";

  let canvas: HTMLCanvasElement;
  let layeredCanvas : LayeredCanvas;
  let arrayLayer: ArrayLayer;
  let focusKeeper: FocusKeeper;
  let marks: boolean[];
  let editingBookId: string | null = null;
  let defaultBubbleSlot = new DefaultBubbleSlot(new Bubble());
  let painter: Painter;
  let imageProvider: ImageProvider;

  let forceRebuild = false;
  let pageIds: string[] = [];
  let readingDirection: ReadingDirection;
  let wrapMode: WrapMode;

  const bubble = derived(
    bubbleInspectorTarget,
    (bit: BubbleInspectorTarget | null) => bit?.bubble,
  );

  $: onUndoCommand($undoToken);
  function onUndoCommand(t: 'undo' | 'redo' | null) {
    $undoToken = null;
    if (t == 'undo') { undo(); }
    if (t == 'redo') { redo(); }
  }

  function hint(r: [number, number, number, number] | null, s: string | null) {
    if (s) {
      const q0 = convertPointFromNodeToPage(canvas, r![0], r![1]);
      // TODO: w, hの計算がおかしい
      toolTipRequest.set({ message: s, rect: { left: q0.x, top: q0.y, width: r![2], height: r![3] } });
    } else {
      toolTipRequest.set(null);
    }
  }

  // FileManagerRootのsaveと二重にdelayedCommmiterがかかっているのは無駄に見えるが、
  // commitBookの中でaddBookHistoryが呼ばれており、これが全ページのcloneを行う重い処理なので
  // フキダシ編集のような軽微な変更でなんども呼び出されないようにここでも一応バッファリングしておく
  const delayedCommiter = new DelayedCommiterGroup(
    {
      "standard": () => {
        commitInternal(null);
      },
      "bubble": () => {
        commitInternal("bubble");
      },
      "effect": () => {
        commitInternal("effect");
      },
      "page-size": () => {
        commitInternal("page-size");
      },
    });

  function commitInternal(tag: HistoryTag) {
    commitBook($mainBook!, tag);
    console.tag("commit", "cyan", $mainBook!.revision, $mainBook!.history.entries[$mainBook!.history.cursor-1])
    $mainBook = $mainBook;
    layeredCanvas.redraw();
  }

  function commit(tag: HistoryTag) {
    delayedCommiter.schedule(tag ?? "standard", tag ? 2000 : 0); 
    if (tag === 'bubble') {
      $bubbleInspectorTarget = $bubbleInspectorTarget;
    }
  }

  function revert() {
    delayedCommiter.cancel();
    revertBook($mainBook!);
    resetBubbleCache();
    $mainBook = $mainBook;
    if ($frameInspectorTarget) {
      $frameInspectorTarget = null;
    }
  }

  function undo() {
    if (painter.isPainting()) {
      painter.undo();
    } else {
      undoBookHistory($mainBook!);
      revert();
      focusKeeper.setFocus(null);
    }
  }

  function redo() {
    if (painter.isPainting()) {
      painter.redo();
    } else {
      redoBookHistory($mainBook!);
      revert();
      focusKeeper.setFocus(null);
    }
  }

  function viewportChanged() {
    $viewport = $viewport;
  }

  function rescueResidual(media: HTMLCanvasElement | HTMLVideoElement | string) {
    console.log("rescueResidual", media);

    if (typeof media === "string") { return; }

    const book = $mainBook!;
    const page = insertNewPageToBook(book, book.pages.length);
    const paperSize = page.paperSize;

    const rootFrameTree = FrameElement.compile(frameExamples[2].frameTree);
    const frameTree = rootFrameTree.children[0];
    const film = new Film(buildMedia(media));
    frameTree.filmStack.films = [film];

    const transformer = new FilmStackTransformer(paperSize, frameTree.filmStack.films);
    transformer.scale(0.01);
    const layout = calculatePhysicalLayout(rootFrameTree, paperSize, [0, 0]);
    constraintLeaf(page.paperSize, findLayoutOf(layout, frameTree)!);

    page.frameTree = rootFrameTree;

    commit(null);
  }

  function insertPage(pageIndex: number) {
    focusKeeper.setFocus(null);
    $redrawToken = true;
    triggerTemplateChoice.trigger().then(result => {
      if (result != null) {
        $mainBook!.newPageProperty.templateName = result;
        insertNewPageToBook($mainBook!, pageIndex);
        commit(null);
      }
    });
  }

  function deletePage(index: number) {
    $mainBook!.pages.splice(index, 1);
    commit(null);
  }

  function movePages(from: number[], to: number) {
    const restPages = $mainBook!.pages.filter((_, i) => !from.includes(i));
    const movedPages = from.map(i => $mainBook!.pages[i]);
    $mainBook!.pages = [...restPages.slice(0, to), ...movedPages, ...restPages.slice(to)];
    commit(null);
  }

  function duplicatePages(from: number[], to: number) {
    const targetPages = from.map(i => clonePage($mainBook!.pages[i]));
    $mainBook!.pages = [
      ...$mainBook!.pages.slice(0, to),
      ...targetPages,
      ...$mainBook!.pages.slice(to)
    ];
    commit(null);
  }

  function copyPageToClipboard(index: number) {
    const page = $mainBook!.pages[index];
    analyticsEvent('copy_page_to_clipboard');
    copyToClipboard(page, false);
  }

  function batchImaging(index: number) {
    console.log("batchImaging", index);
    $frameInspectorTarget = null;
    $bubbleInspectorTarget = null;
    $batchImagingPage = $mainBook!.pages[index];
  }

  function editBubbles(index: number) {
    console.log("editBubbles", index);
    delayedCommiter.force();
    $bubbleBucketPage = $mainBook!.pages[index];
  }

  function tweak(index: number) {
    console.log("tweak", index);
    $pageInspectorTarget = $mainBook!.pages[index];
  }

  $: if ($bubbleBucketDirty) {
    commit(null);
    $bubbleBucketDirty = false;
  }

  function shift(_page: Page, element: FrameElement) {
    const frameSeq = collectBookContents($mainBook!);
    dealBookContents(frameSeq, element, null);
    commit(null);
  }

  function unshift(_page: Page, element: FrameElement) {
    const frameSeq = collectBookContents($mainBook!);
    dealBookContents(frameSeq, null, element);
    commit(null);
  }

  function swap(_page: Page, element0: FrameElement, element1: FrameElement) {
    const frameSeq = collectBookContents($mainBook!);
    swapBookContents(frameSeq, element0, element1);
    commit(null);
  }

  function insert(_page: Page, border: Border) {
    const element = border.layout.element;
    const index = border.index;
    element.insertElement(index);
    commit(null);
  }

  $: onChangePaperSize($mainBook?.newPageProperty.paperSize);
  function onChangePaperSize(paperSize: [number, number] | undefined) {
    if (!paperSize) { return; }
    let modified = false;
    for (const page of $mainBook!.pages) {
      console.log(page.paperSize, paperSize);
      if (page.paperSize[0] === paperSize[0] && page.paperSize[1] === paperSize[1]) {
        continue;
      }
      page.paperSize = [...paperSize];
      modified = true;
    }
    if (!modified) { return; }
    forceRebuild = true;
    $mainBook = $mainBook;
    commit('page-size');
  }

  $: onChangeBookProperty($mainBook?.direction, $mainBook?.wrapMode);
  function onChangeBookProperty(newDirection: ReadingDirection | undefined, newWrapMode: WrapMode | undefined) {
    if (newDirection == null || newWrapMode == null) { return; }
    if (readingDirection != newDirection || wrapMode != newWrapMode) {
      readingDirection = newDirection;
      wrapMode = newWrapMode;
      forceRebuild = true;
      $mainBook = $mainBook;
      commit(null);
    }
  }

  $: onChangeBook(canvas, $mainBook!);
  function onChangeBook(canvas: HTMLCanvasElement, book: Book) {
    console.log("onChangeBook");
    if (!canvas || !book) { return; }

    if (arrayLayer && 
        (readingDirection != book.direction ||
         wrapMode != book.wrapMode)) {

      readingDirection = book.direction;
      wrapMode = book.wrapMode;

      const direction = getDirectionFromReadingDirection(book.direction);
      const {fold, gapX, gapY} = getFoldAndGapFromWrapMode(wrapMode);
      arrayLayer.array.direction = direction;
      arrayLayer.array.fold = fold;
      arrayLayer.array.gapX = gapX;
      arrayLayer.array.gapY = gapY;
      for (const paper of arrayLayer.array.papers) {
        paper.paper.findLayer(BubbleLayer)!.setFold(fold);
      } 

      $viewport!.dirty = true;
      layeredCanvas.redraw();
    }

    const newPageIds = book.pages.map(p => p.id);
    if (!forceRebuild) {
      if (arrayLayer) {
        if (pageIds.join(",") === newPageIds.join(",")) {
          // frames/bubblesの再設定だけは毎回しておく
          let i = 0;
          for (const paper of arrayLayer.array.papers) {
            const rendererLayer = paper.paper.findLayer(PaperRendererLayer) as PaperRendererLayer;
            rendererLayer.setBubbles(book.pages[i].bubbles);
            rendererLayer.setFrameTree(book.pages[i].frameTree);
            i++;
          } 
          layeredCanvas.redraw();
          return;
        }
      }
    }
    pageIds = newPageIds;
    forceRebuild = false;

    console.log("*********** buildBookEditor from BookEditor");
    if (layeredCanvas) {
      layeredCanvas.cleanup();
    }

    if (!$viewport || editingBookId !== book.revision.id) {
      console.log("================ viewport remake");
      const v = new Viewport(canvas, hint);
      v.translate = [150, 0];
      $viewport = v;
    }
    $viewport.dirty = true;
    editingBookId = book.revision.id;

    const bookEditorInstance: BookOperators = {
      hint,
      commit,
      forceDelayedCommit: delayedCommiter.force,
      cancelDelayedCommit: delayedCommiter.cancel,
      revert,
      undo,
      redo,
      shift,
      unshift,
      swap,
      insert,
      focusFrame,
      focusBubble,
      viewportChanged,
      insertPage,
      deletePage,
      movePages,
      duplicatePages,
      rescueResidual,
      copyPageToClipboard,
      batchImaging,
      editBubbles,
      tweak,
      chase,
      getMarks,
      setMarks,
      getFocusedPage,
    };
    $bookEditor = bookEditorInstance;

    const builtBook = buildBookEditor(
      $viewport,
      book,
      $bookEditor,
      defaultBubbleSlot);
    layeredCanvas = builtBook.layeredCanvas;
    layeredCanvas.redraw();
    arrayLayer = builtBook.arrayLayer;
    focusKeeper = builtBook.focusKeeper;
    marks = builtBook.marks;
  }

  $:onSplitCursor($bubbleSplitCursor);
  function onSplitCursor(cursor: number | null) {
    if (cursor == null || layeredCanvas == null) { return; }
    $bubbleSplitCursor = null;
    const page = $bubbleInspectorTarget!.page;
    const oldBubble = $bubble!;

    const text = oldBubble.text;

    const paperSize = page.paperSize;
    const bubbleSize = oldBubble.getPhysicalSize(paperSize)
    const width = bubbleSize[0];
    const center = oldBubble.getPhysicalCenter(paperSize);

    const newBubble = defaultBubbleSlot.bubble.clone(false);
    newBubble.n_p0 = oldBubble.n_p0;
    newBubble.n_p1 = oldBubble.n_p1;
    newBubble.initOptions();
    newBubble.text = text.slice(cursor).trimStart();
    page.bubbles.push(newBubble);

    oldBubble.text = text.slice(0, cursor).trimEnd();

    const c0: Vector = [center[0] + width / 2, center[1]];
    const c1: Vector = [center[0] - width / 2, center[1]];
    if (oldBubble.direction === 'v') {
      oldBubble.setPhysicalCenter(paperSize, c0);
      newBubble.setPhysicalCenter(paperSize, c1);
    } else {
      oldBubble.setPhysicalCenter(paperSize, c1);
      newBubble.setPhysicalCenter(paperSize, c0);
    }

    const oldSize = oldBubble.calculateFitSize(paperSize);
    oldBubble.setPhysicalSize(paperSize, oldSize);
    const newSize = newBubble.calculateFitSize(paperSize);
    newBubble.setPhysicalSize(paperSize, newSize);

    $bubbleInspectorTarget!.bubble = newBubble;
    commit(null);
    $redrawToken = true;
  }

  function focusFrame(page: Page, f: FrameElement | null, p: Vector | null) {
    console.log("focusFrame", f);
    if (f) {
      const [cx, cy] = p!;
      const offset = canvas.height / 2 < cy ? -1 : 1;

      $frameInspectorTarget = {
        frame: f,
        page,
        command: null,
        commandTargetFilm: null,
      };
    } else {
      if (page == $frameInspectorTarget?.page) {
        $frameInspectorTarget = null;
      }
    }
  }

  function focusBubble(page: Page, b: Bubble | null) {
    delayedCommiter.force();
    if (b) {
      console.log("show bubble");
      const bp = b.getPhysicalCenter(page.paperSize);
      const pageIndex = $mainBook!.pages.findIndex(p => p.id === page.id);
      const rp = arrayLayer.array.childPositionToParentPosition(pageIndex, bp);
      const cp = layeredCanvas.rootPaperPositionToCanvasPosition(rp);

      const [cx, cy] = cp;
      const offset = canvas.height / 2 < cy ? -1 : 1;
      const bubbleSize = b.getPhysicalSize(page.paperSize);
      
      $bubbleInspectorTarget = {
        bubble: b,
        page,
        command: null,
        commandTargetFilm: null,
      };
      defaultBubbleSlot.bubble = b;
    } else {
      if (page == $bubbleInspectorTarget?.page) {
        console.log("hide bubble");
        $bubbleInspectorTarget = null;
      }
    }
  }

  // フレーム操作コマンドのハンドラ初期化
  $: setFrameCommandTools(
    commit,
    delayedCommiter.force,
    painter?.runWithFrame?.bind(painter),
    imageProvider?.run?.bind(imageProvider)
  );

  // フレームコマンドは自動的にサブスクライブされるので監視不要

  // バブルコマンド監視
  // バブル操作コマンドのハンドラ初期化
  $: setBubbleCommandTools(
    commit,
    delayedCommiter.force,
    painter?.runWithBubble?.bind(painter),
    imageProvider?.run?.bind(imageProvider)
  );

  // バブルコマンドは自動的にサブスクライブされるので監視不要

  onDestroy(() => {
    layeredCanvas.cleanup();
  });

  function onResize(e: CustomEvent) {
    if (!layeredCanvas || !$viewport) { return; }
    $viewport.dirty = true;
    layeredCanvas.redraw();
  }

  function chase() {
    painter.chase();
  }

  function getFocusedPage(): Page {
    const v = $viewport!;
    const p = v.canvasPositionToViewportPosition(v.getCanvasCenter());
    const index = arrayLayer.array.findNearestPaperIndex(p);
    return $mainBook!.pages[index];
  }

  function getMarks() {
    return marks;
  }

  function setMarks(m: boolean[]) {
    marks = m;
  }

  $: onRedraw($redrawToken);
  function onRedraw(token: boolean) {
    if (!token) { return; }
    if (layeredCanvas != null) {
      resetBubbleCache();
      layeredCanvas.redraw();
    }
    $redrawToken = false; 
  }

  function resetBubbleCache() {
    let i = 0;
    const pages = $mainBook!.pages;
    if (pages.length != arrayLayer.array.papers.length) {
      // ページ数が変わったため、再構築するはずなので無視して良い
      return;
    }
    for (const paper of arrayLayer.array.papers) {
      const rendererLayer = paper.paper.findLayer(PaperRendererLayer) as PaperRendererLayer;
      rendererLayer.setBubbles(pages[i++].bubbles);
      rendererLayer.resetCache();
    } 
  }
/*
  // 特定のページにフォーカスする
  $: if ($tryOutToken) {
    $tryOutToken = false;
    focusToPage()
  }
  function focusToPage() {
    const [cw, ch] = $viewport!.getCanvasSize();
    const index = 2;
    const paper = arrayLayer.array.papers[index];
    const [pw, ph] = paper.paper.size;
    const scale = Math.min(cw / pw, ch / ph) * 0.98;
    const p = paper.center;
    $viewport!.scale = scale;
    $viewport!.translate = [-p[0] * scale, -p[1] * scale];
    $viewport!.dirty = true;
    layeredCanvas.redraw();
  }
*/
</script>

<div class="main-paper-container">
  <AutoSizeCanvas bind:canvas={canvas} on:resize={onResize}>
  <!--
    {#if bubbleLayer?.defaultBubble}
    <p style={getFontStyle2(bubbleLayer.defaultBubble.fontFamily, "400")}>あ</p> <!- 事前読み込み、ローカルフォントだと多分エラー出る ->
    {/if}
  -->
  </AutoSizeCanvas>
</div>

<Painter bind:this={painter} bind:layeredCanvas bind:arrayLayer/>
<ImageProvider bind:this={imageProvider}/>

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
