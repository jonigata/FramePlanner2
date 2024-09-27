
<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { onDestroy } from 'svelte';
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { FrameElement, calculatePhysicalLayout, findLayoutOf, type Border } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { bubbleInspectorTarget, bubbleSplitCursor, type BubbleInspectorTarget } from './bubbleinspector/bubbleInspectorStore';
  import { frameInspectorTarget, type FrameInspectorTarget } from './frameinspector/frameInspectorStore';
  import type { Book, Page, BookOperators, HistoryTag, ReadingDirection, WrapMode } from './book';
  import { undoBookHistory, redoBookHistory, commitBook, revertBook, collectBookContents, dealBookContents, swapBookContents } from './book';
  import { mainBook, bookEditor, viewport, newPageProperty, redrawToken, undoToken, insertNewPageToBook } from './bookStore';
  import { buildBookEditor, getFoldAndGapFromWrapMode, getDirectionFromReadingDirection } from './bookEditorUtils';
  import AutoSizeCanvas from './AutoSizeCanvas.svelte';
  import { BubbleLayer, DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
  import Painter from '../painter/Painter.svelte';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import ImageProvider from '../generator/ImageProvider.svelte';
  import { loadModel, predict } from '../utils/rmbg';
  import { loading } from '../utils/loadingStore'
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { batchImagingPage } from '../generator/batchImagingStore';
  import { copyToClipboard } from '../utils/saver/copyToClipboard';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { getAnalytics, logEvent } from "firebase/analytics";
  import { bubbleBucketPage, bubbleBucketDirty } from '../bubbleBucket/bubbleBucketStore';
  import { minimumBoundingScale } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { triggerTemplateChoice } from "./templateChooserStore";
  import { pageInspectorTarget } from "./pageinspector/pageInspectorStore";
  import type { FocusKeeper } from "../lib/layeredCanvas/tools/focusKeeper";
  import { createImageFromCanvas } from "../utils/imageUtil";
  import { trapezoidBoundingRect } from "../lib/layeredCanvas/tools/geometry/trapezoid";
  import { DelayedCommiterGroup } from '../utils/delayedCommiter';

  let canvas: HTMLCanvasElement;
  let layeredCanvas : LayeredCanvas;
  let arrayLayer: ArrayLayer;
  let focusKeeper: FocusKeeper;
  let marks: boolean[];
  let editingBookId: string = null;
  let defaultBubbleSlot = new DefaultBubbleSlot(new Bubble());
  let painter: Painter;
  let imageProvider: ImageProvider;

  let forceRebuild = false;
  let pageIds: string[] = [];
  let readingDirection: ReadingDirection;
  let wrapMode: WrapMode;

  const bubble = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.bubble,
    (b, bit) => {
      bit.bubble = b;
      return bit;
    }
  );

  $: onUndoCommand($undoToken);
  function onUndoCommand(t: 'undo' | 'redo') {
    $undoToken = null;
    if (t == 'undo') { undo(); }
    if (t == 'redo') { redo(); }
  }

  function hint(r: [number, number, number, number], s: string) {
    if (s) {
      const q0 = convertPointFromNodeToPage(canvas, r[0], r[1]);
      toolTipRequest.set({ message: s, rect: { left: q0.x, top: q0.y, width: r[2], height: r[3] } });
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
    });

  function commitInternal(tag: HistoryTag) {
    commitBook($mainBook, tag);
    console.tag("commit", "cyan", $mainBook.revision, $mainBook.history.entries[$mainBook.history.cursor-1])
    $mainBook = $mainBook;
    layeredCanvas.redraw();
  }

  function commit(tag: HistoryTag) {
    delayedCommiter.schedule(tag ?? "standard", tag ? 2000 : 0); 
    if (tag === 'bubble') {
      $bubble = $bubble;
    }
  }

  function revert() {
    delayedCommiter.cancel();
    revertBook($mainBook);
    resetBubbleCache();
    $mainBook = $mainBook;
    if ($frameInspectorTarget) {
      $frameInspectorTarget.frame = null;
    }
  }

  function undo() {
    if (painter.isPainting()) {
      painter.undo();
    } else {
      undoBookHistory($mainBook);
      revert();
      focusKeeper.setFocus(null);
    }
  }

  function redo() {
    if (painter.isPainting()) {
      painter.redo();
    } else {
      redoBookHistory($mainBook);
      revert();
      focusKeeper.setFocus(null);
    }
  }

  function viewportChanged() {
    $viewport = $viewport;
  }

  function insertPage(pageIndex: number) {
    focusKeeper.setFocus(null);
    $redrawToken = true;
    triggerTemplateChoice.trigger().then(result => {
      if (result != null) {
        $newPageProperty.templateIndex = result;
        insertNewPageToBook($mainBook, $newPageProperty, pageIndex);
        commit(null);
      }
    });
  }

  function deletePage(index: number) {
    $mainBook.pages.splice(index, 1);
    commit(null);
  }

  function movePages(from: number[], to: number) {
    const restPages = $mainBook.pages.filter((_, i) => !from.includes(i));
    const movedPages = from.map(i => $mainBook.pages[i]);
    $mainBook.pages = [...restPages.slice(0, to), ...movedPages, ...restPages.slice(to)];
    commit(null);
  }

  function copyPageToClipboard(index: number) {
    const page = $mainBook.pages[index];
    logEvent(getAnalytics(), 'copy_page_to_clipboard');
    copyToClipboard(page);
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});
  }

  function batchImaging(index: number) {
    console.log("batchImaging", index);
    $frameInspectorTarget = null;
    $bubbleInspectorTarget = null;
    $batchImagingPage = $mainBook.pages[index];
  }

  function editBubbles(index: number) {
    console.log("editBubbles", index);
    delayedCommiter.force();
    $bubbleBucketPage = $mainBook.pages[index];
  }

  function tweak(index: number) {
    console.log("tweak", index);
    $pageInspectorTarget = $mainBook.pages[index];
  }

  $: if ($bubbleBucketDirty) {
    commit(null);
    $bubbleBucketDirty = false;
  }

  function shift(_page: Page, element: FrameElement) {
    const frameSeq = collectBookContents($mainBook);
    dealBookContents(frameSeq, element, null);
    commit(null);
  }

  function unshift(_page: Page, element: FrameElement) {
    const frameSeq = collectBookContents($mainBook);
    dealBookContents(frameSeq, null, element);
    commit(null);
  }

  function swap(_page: Page, element0: FrameElement, element1: FrameElement) {
    const frameSeq = collectBookContents($mainBook);
    swapBookContents(frameSeq, element0, element1);
    commit(null);
  }

  function insert(_page: Page, border: Border) {
    const element = border.layout.element;
    const index = border.index;
    element.insertElement(index);
    commit(null);
  }

  $: onChangePaperSize($newPageProperty.paperSize);
  function onChangePaperSize(paperSize: [number, number]) {
    console.log("onChangePaperSize");
    if ($mainBook == null) { return; }
    for (const page of $mainBook.pages) {
      page.paperSize = paperSize;
    }
    forceRebuild = true;
    $mainBook = $mainBook;
    commit(null);
  }

  $: onChangeBook(canvas, $mainBook);
  function onChangeBook(canvas: HTMLCanvasElement, book: Book) {
    if (!canvas || !book) { return; }

    if (arrayLayer && 
        (readingDirection != $mainBook.direction ||
         wrapMode != $mainBook.wrapMode)) {

      readingDirection = $mainBook.direction;
      wrapMode = $mainBook.wrapMode;

      const direction = getDirectionFromReadingDirection(book.direction);
      const {fold, gapX, gapY} = getFoldAndGapFromWrapMode(wrapMode);
      arrayLayer.array.direction = direction;
      arrayLayer.array.fold = fold;
      arrayLayer.array.gapX = gapX;
      arrayLayer.array.gapY = gapY;
      for (const paper of arrayLayer.array.papers) {
        paper.paper.findLayer(BubbleLayer).setFold(fold);
      } 

      $viewport.dirty = true;
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
    const page = $bubbleInspectorTarget.page;
    const oldBubble = $bubble;

    const text = $bubble.text;

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

    $bubbleInspectorTarget.bubble = newBubble;
    commit(null);
    $redrawToken = true;
  }

  function focusFrame(page: Page, f: FrameElement, p: Vector) {
    console.log("focusFrame", f);
    if (f) {
      const [cx, cy] = p;
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

  function focusBubble(page: Page, b: Bubble) {
    delayedCommiter.force();
    if (b) {
      console.log("show bubble");
      const bp = b.getPhysicalCenter(page.paperSize);
      const pageIndex = $mainBook.pages.findIndex(p => p.id === page.id);
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

  $: onFrameCommand($frameInspectorTarget);
  async function onFrameCommand(fit: FrameInspectorTarget) {
    delayedCommiter.force();
    if (fit && fit.command != null) {
      $frameInspectorTarget = { ...fit, command: null };

      const command = fit.command;
      if (command === "scribble") {
        await modalFrameScribble(fit);
      } else if (command === "generate") {
        await modalFrameGenerate(fit);
      } else if (command === "punch") {
        await punchFrameFilm(fit);
      }
    }
  }

  $: onBubbleCommand($bubbleInspectorTarget);
  async function onBubbleCommand(bit: BubbleInspectorTarget) {
    delayedCommiter.force();
    if (bit && bit.command != null) {
      $bubbleInspectorTarget = { ...bit, command: null };

      const command = bit.command;
      if (command === "scribble") {
        await modalBubbleScribble(bit);
      } else if (command === "generate") {
        await modalBubbleGenerate(bit);
      } else if (command === "punch") {
        await punchBubbleFilm(bit);
      }
    }
  }


  function makeSnapshot(b: Bubble) {
    let films = [];
    for (let film of b.filmStack.films) {
      const f = {
        media: film.media.fileId,
        n_scale: film.n_scale,
        n_translation: film.n_translation,
        rotation: film.rotation,
        reverse: film.reverse,
        visible: film.visible,
        prompt: film.prompt,
      }
      films.push(f);
    }
    const jsonObject = Bubble.decompile(b);
    jsonObject.films = films;
    return JSON.stringify(jsonObject);
  }

  async function modalFrameScribble(fit: FrameInspectorTarget) {
    delayedCommiter.force();
    toolTipRequest.set(null);
    await painter.runWithFrame(fit.page, fit.frame, fit.commandTargetFilm);
    const media = fit.commandTargetFilm.media;
    if (media instanceof ImageMedia) {
      const canvas = media.canvas;
      canvas["clean"] = {};
    }
    commit(null);
  }

  async function modalBubbleScribble(bit: BubbleInspectorTarget) {
    delayedCommiter.force();
    toolTipRequest.set(null);
    await painter.runWithBubble(bit.page, bit.bubble, bit.commandTargetFilm);
    commit(null);
  }

  async function modalFrameGenerate(fit: FrameInspectorTarget) {
    delayedCommiter.force();
    toolTipRequest.set(null);
    const page = fit.page;
    const leaf = fit.frame;
    const r = await imageProvider.run(leaf.prompt, leaf.filmStack, leaf.gallery);

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    const leafLayout = findLayoutOf(pageLayout, leaf);
    if (!r) { return; }

    const { canvas, prompt } = r;
    const film = new Film();
    film.media = new ImageMedia(canvas);
    film.prompt = prompt;

    const frameRect = trapezoidBoundingRect(leafLayout.corners);
    const scale = minimumBoundingScale(film.media.size, [frameRect[2], frameRect[3]]);
    film.setShiftedScale(page.paperSize, scale);

    fit.frame.filmStack.films.push(film);
    fit.frame.prompt = prompt;
    $frameInspectorTarget = $frameInspectorTarget;

    commit(null);
  }

  async function modalBubbleGenerate(bit: BubbleInspectorTarget) {
    const bubble = bit.bubble;
    const r = await imageProvider.run(bubble.prompt, bubble.filmStack, bubble.gallery);
    if (r == null) { return; }
    const film = new Film();
    film.media = new ImageMedia(r.canvas);
    const paperSize = bit.page.paperSize;
    const bubbleSize = bubble.getPhysicalSize(paperSize);
    const scale = minimumBoundingScale(film.media.size, bubbleSize);
    film.setShiftedScale(paperSize, scale);
    bubble.filmStack.films.push(film);
    bubble.prompt = r.prompt;
    $bubbleInspectorTarget = $bubbleInspectorTarget;
  }

  async function punchFrameFilm(fit: FrameInspectorTarget) {
    const imageMedia = fit.commandTargetFilm.media as ImageMedia;
    if (!(imageMedia instanceof ImageMedia)) { return; }

    $loading = true;
    console.log("A");
    await loadModel((s: string) => console.log(s));
    
    console.log("B");
    const film = fit.commandTargetFilm;
    const canvas = await predict(await createImageFromCanvas(imageMedia.canvas));
    console.log("C");
    const dataURL = canvas.toDataURL("image/png");
    console.log("D");
    film.media = new ImageMedia(canvas);
    commit(null);
    $loading = false;
  }

  async function punchBubbleFilm(bit: BubbleInspectorTarget) {
    console.log("punchBubbleFilm");
    const imageMedia = bit.commandTargetFilm.media as ImageMedia;
    if (!(imageMedia instanceof ImageMedia)) { 
      console.log("not ImageMedia", bit.commandTargetFilm.media);
      return; 
    }

    $loading = true;
    await loadModel((s: string) => console.log(s));
    
    const film = bit.commandTargetFilm;
    const canvas = await predict(await createImageFromCanvas(imageMedia.canvas));
    film.media = new ImageMedia(canvas);
    commit(null);
    $loading = false;

    $bubble = $bubble;
  }

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
    const v = $viewport;
    const p = v.canvasPositionToViewportPosition(v.getCanvasCenter());
    const index = arrayLayer.array.findNearestPaperIndex(p);
    return $mainBook.pages[index];
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
    const pages = $mainBook.pages;
    for (const paper of arrayLayer.array.papers) {
      const rendererLayer = paper.paper.findLayer(PaperRendererLayer) as PaperRendererLayer;
      rendererLayer.setBubbles(pages[i++].bubbles);
      rendererLayer.resetCache();
    } 
  }

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