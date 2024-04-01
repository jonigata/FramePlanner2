
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { derived } from "svelte/store";
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { FrameElement, Film } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { bubbleInspectorTarget, bubbleSplitCursor, bubbleInspectorPosition } from './bubbleinspector/bubbleInspectorStore';
  import { frameInspectorTarget, frameInspectorPosition, type FrameInspectorTarget } from './frameinspector/frameInspectorStore';
  import type { Book, Page, BookOperators, HistoryTag, ReadingDirection, WrapMode } from './book';
  import { undoBookHistory, redoBookHistory, commitBook, revertBook, newPage, collectBookContents, dealBookContents } from './book';
  import { mainBook, bookEditor, viewport, newPageProperty, redrawToken, forceFontLoadToken, forceCommitDelayedToken } from './bookStore';
  import { buildBookEditor, getFoldAndGapFromWrapMode, getDirectionFromReadingDirection } from './bookEditorUtils';
  import AutoSizeCanvas from './AutoSizeCanvas.svelte';
  import { DelayedCommiter } from '../utils/cancelableTask';
  import { BubbleLayer, DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
  import Painter from '../painter/Painter.svelte';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";
  import ImageProvider from '../generator/ImageProvider.svelte';
  import { loadModel, predict } from '../utils/rmbg';
  import { loading } from '../utils/loadingStore'
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { batchImagingPage } from '../generator/batchImagingStore';

  let canvas: HTMLCanvasElement;
  let layeredCanvas : LayeredCanvas;
  let arrayLayer: ArrayLayer;
  let bubbleSnapshot: string = null;
  let delayedCommiter = new DelayedCommiter(
    () => {
      commit("bubble"); 
      layeredCanvas.redraw(); 
    });
  let editingBookId: string = null;
  let defaultBubbleSlot = new DefaultBubbleSlot(new Bubble());
  let painter: Painter;
  let imageProvider: ImageProvider;

  let pageIds: string[] = [];
  let readingDirection: ReadingDirection;
  let wrapMode: WrapMode;

  const bubble = derived(bubbleInspectorTarget, (b) => b?.bubble);
  const bubblePage = derived(bubbleInspectorTarget, (b) => b?.page);

  $: if ($forceCommitDelayedToken) {
    $forceCommitDelayedToken = false;
    delayedCommiter.force();
  }

  function hint(p: [number, number], s: string) {
    if (s) {
      const q = convertPointFromNodeToPage(canvas, ...p);
      q.y -= 25;
      toolTipRequest.set({ message: s, position: q });
    } else {
      toolTipRequest.set(null);
    }
  }

  export function commit(tag: HistoryTag) {
    delayedCommiter.force();
    commitBook($mainBook, tag);
    console.tag("commit", "cyan", $mainBook.revision, $mainBook.history.entries[$mainBook.history.cursor-1])
    $mainBook = $mainBook;
    $frameInspectorTarget = $frameInspectorTarget;
  }

  function revert() {
    delayedCommiter.cancel();
    revertBook($mainBook);
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
    }
  }

  function redo() {
    if (painter.isPainting()) {
      painter.redo();
    } else {
      redoBookHistory($mainBook);
      revert();
    }
  }

  function viewportChanged() {
    $viewport = $viewport;
  }

  function insertPage(index: number) {
    const p = $newPageProperty;
    const example = frameExamples[p.templateIndex];
    const bubbles = example.bubbles.map(b => Bubble.compile(p.paperSize, b));
    const page = newPage(FrameElement.compile(example.frameTree), bubbles);
    page.paperSize = [...p.paperSize];
    page.paperColor = p.paperColor;
    page.frameColor = p.frameColor;
    page.frameWidth = p.frameWidth;
    $mainBook.pages.splice(index, 0, page);
    commit(null);
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

  function batchImaging(index: number) {
    console.log("batchImaging", index);
    $batchImagingPage = $mainBook.pages[index];
  }

  function insert(_page: Page, element: FrameElement) {
    const frameContents = collectBookContents($mainBook);
    dealBookContents($mainBook, frameContents, element, null);
    layeredCanvas.redraw();
    commit(null);
  }

  function splice(_page: Page, element: FrameElement) {
    const frameContents = collectBookContents($mainBook);
    dealBookContents($mainBook, frameContents, null, element);
    layeredCanvas.redraw();
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
      const [fold, gap] = getFoldAndGapFromWrapMode(wrapMode);
      arrayLayer.array.direction = direction;
      arrayLayer.array.fold = fold;
      arrayLayer.array.gap = gap;
      for (const paper of arrayLayer.array.papers) {
        paper.paper.findLayer(BubbleLayer).setFold(fold);
      } 

      $viewport.dirty = true;
      layeredCanvas.redraw();
    }

    const newPageIds = book.pages.map(p => p.id);
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
    pageIds = newPageIds;

    console.log("*********** buildBookEditor from BookEditor");
    if (layeredCanvas) {
      layeredCanvas.cleanup();
    }

    if (!$viewport || editingBookId !== book.revision.id) {
      console.log("================ viewport remake");
      $viewport = new Viewport(canvas, hint);
    }
    $viewport.dirty = true;
    editingBookId = book.revision.id;

    const bookEditorInstance: BookOperators = {
      hint,
      commit,
      revert,
      undo,
      redo,
      insert,
      splice,
      focusFrame,
      focusBubble,
      viewportChanged,
      insertPage,
      deletePage,
      movePages,
      batchImaging,
      chase,
    };
    $bookEditor = bookEditorInstance;

    const builtBook = buildBookEditor(
      $viewport,
      book,
      $bookEditor,
      defaultBubbleSlot);
    layeredCanvas = builtBook.layeredCanvas;
    console.log("setting layeredCanvas", layeredCanvas);
    layeredCanvas.redraw();
    arrayLayer = builtBook.arrayLayer;
  }

  $: onBubbleModified($bubble);
  function onBubbleModified(bubble: Bubble) {
    if (!layeredCanvas) { return; }

    layeredCanvas.redraw();

    if (bubbleSnapshot && bubble) {
      const snapshot = JSON.stringify(Bubble.decompile(bubble));
      if (bubbleSnapshot !== snapshot) {
        $forceFontLoadToken = true;
        delayedCommiter.schedule(2000);
      }
    }
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

    const newBubble = defaultBubbleSlot.bubble.clone();
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

  function findBubblePage(book: Book, bubble: Bubble) {
    for (const page of book.pages) {
      if (page.bubbles.includes(bubble)) {
        return page;
      }
    }
    return null;
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
      $frameInspectorPosition = {
        center: convertPointFromNodeToPage(canvas, cx, cy),
        height: 100,
        offset
      };
    } else {
      $frameInspectorTarget = null;      
    }
  }

  function focusBubble(page: Page, b: Bubble, p: Vector) {
    delayedCommiter.force();
    if (b) {
      const [cx, cy] = p;
      const offset = canvas.height / 2 < cy ? -1 : 1;
      const bubbleSize = b.getPhysicalSize(page.paperSize);
      
      bubbleSnapshot = JSON.stringify(Bubble.decompile(b)); // サイズは比較時に合致してればいいので適当に
      $bubbleInspectorTarget = {
        bubble: b,
        page,
      };
      $bubbleInspectorPosition = {
        center: convertPointFromNodeToPage(canvas, cx, cy),
        height: bubbleSize[1],
        offset
      };
      defaultBubbleSlot.bubble = b;
    } else {
      bubbleSnapshot = null;
      $bubbleInspectorTarget = null;
    }
  }

  let frameInspectorTargetBackUp: FrameInspectorTarget;
  $: onFrameCommand($frameInspectorTarget);
  async function onFrameCommand(fit: FrameInspectorTarget) {
    if (fit) {
      frameInspectorTargetBackUp = { ...fit };
      frameInspectorTargetBackUp.command = null;
      $frameInspectorTarget = null;

      const command = fit.command;
      if (command === "scribble") {
        await modalScribble(fit);
      } else if (command === "generate") {
        await modalGenerate(fit);
      } else if (command === "punch") {
        await punch(fit);
      } else if (command === "commit") {
        commit(null);
      }
      $frameInspectorTarget = frameInspectorTargetBackUp;
    }
  }


  async function modalScribble(fit: FrameInspectorTarget) {
    delayedCommiter.force();
    toolTipRequest.set(null);
    await painter.run(fit.page, fit.frame, fit.commandTargetFilm);
    commit(null);
  }

  async function modalGenerate(fit: FrameInspectorTarget) {
    delayedCommiter.force();
    toolTipRequest.set(null);
    const r = await imageProvider.run(fit.page, fit.frame);
    if (r) {
      const { image, prompt } = r;
      const film = new Film();
      film.image = image;
      film.prompt = prompt;
      fit.frame.filmStack.films.push(film);
      fit.frame.prompt = prompt;
      commit(null);
    }
  }

  async function punch(fit: FrameInspectorTarget) {
    $loading = true;
    await loadModel((s: string) => console.log(s));
    
    const film = fit.commandTargetFilm;
    const canvas = await predict(film.image);
    const dataURL = canvas.toDataURL("image/png");
    const newImage = new Image();
    newImage.src = dataURL;
    await newImage.decode();
    film.image = newImage;
    layeredCanvas.redraw();
    commit(null);
    $loading = false;
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

  $: onRedraw($redrawToken);
  function onRedraw(token: boolean) {
    console.log("=================redrawToken", token, layeredCanvas);
    if (!token) { return; }
    if (layeredCanvas != null) {
      let i = 0;
      const pages = $mainBook.pages;
      for (const paper of arrayLayer.array.papers) {
        const rendererLayer = paper.paper.findLayer(PaperRendererLayer) as PaperRendererLayer;
        rendererLayer.setBubbles(pages[i++].bubbles);
        rendererLayer.resetCache();
      } 
      console.log("redraw");
      layeredCanvas.redraw();
    }
    $redrawToken = false; 
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