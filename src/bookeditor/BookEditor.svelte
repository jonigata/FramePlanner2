
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { derived } from "svelte/store";
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { bubbleInspectorTarget, bubbleSplitCursor, bubbleInspectorPosition } from './bubbleinspector/bubbleInspectorStore';
  import type { Book, Page, BookOperators, HistoryTag, ReadingDirection, WrapMode } from './book';
  import { undoBookHistory, redoBookHistory, commitBook, revertBook, newPage, collectBookContents, dealBookContents } from './book';
  import { mainBook, bookEditor, viewport, newPageProperty, redrawToken } from './bookStore';
  import { buildBookEditor, getFoldAndGapFromWrapMode, getDirectionFromReadingDirection } from './bookEditorUtils';
  import AutoSizeCanvas from './AutoSizeCanvas.svelte';
  import { DelayedCommiter } from '../utils/cancelableTask';
  import { DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
  import { imageGeneratorTarget } from '../generator/imageGeneratorStore';
  import Painter from '../painter/Painter.svelte';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import { frameExamples } from "../lib/layeredCanvas/tools/frameExamples";

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

  let pageIds: string[] = [];
  let readingDirection: ReadingDirection;
  let wrapMode: WrapMode;

  const bubble = derived(bubbleInspectorTarget, (b) => b?.bubble);
  const bubblePage = derived(bubbleInspectorTarget, (b) => b?.page);

  $: if ($redrawToken) {
    $redrawToken = false; 
    layeredCanvas?.redraw();
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
  }

  function revert() {
    delayedCommiter.cancel();
    revertBook($mainBook);
    $mainBook = $mainBook;
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
    const page = newPage(FrameElement.compile(example.frameTree), []);
    page.paperSize = [...p.paperSize];
    page.paperColor = p.paperColor;
    page.frameColor = p.frameColor;
    page.frameWidth = p.frameWidth;
    $mainBook.pages.splice(index+1, 0, page);
    commit(null);
  }

  function deletePage(index: number) {
    $mainBook.pages.splice(index, 1);
    commit(null);
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

  function modalGenerate(page: Page, e: FrameElement) {
    delayedCommiter.force();
    $imageGeneratorTarget = e;
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

      $viewport.dirty = true;
      layeredCanvas.redraw();
    }

    const newPageIds = book.pages.map(p => p.id);
    if (pageIds.join(",") === newPageIds.join(",")) {
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
      modalGenerate,
      modalScribble,
      insert,
      splice,
      focusBubble,
      viewportChanged,
      insertPage,
      deletePage,
      chase,
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
  }

  $: onBubbleModified($bubble);
  function onBubbleModified(bubble: Bubble) {
    if (!layeredCanvas) { return; }

    layeredCanvas.redraw();

    if (bubbleSnapshot && bubble) {
      const snapshot = JSON.stringify(Bubble.decompile(bubble));
      if (bubbleSnapshot !== snapshot) {
        console.log("bubbleSnapshot actually changed");
        delayedCommiter.schedule(2000);
        setTimeout(() => {
          bubble.fontRenderVersion++;
          layeredCanvas.redraw()
        }, 5000);
      }
    }
  }

  $:onSplitCursor($bubbleSplitCursor);
  function onSplitCursor(cursor: number | null) {
    if (cursor == null || layeredCanvas == null) { return; }
    $bubbleSplitCursor = null;

    const text = $bubble.text;

    const paperSize = $bubblePage.paperSize;
    const bubbleSize = $bubble.getPhysicalSize(paperSize)
    const width = bubbleSize[0];
    const center = $bubble.getPhysicalCenter(paperSize);

    const newBubble = defaultBubbleSlot.bubble.clone();
    newBubble.n_p0 = $bubble.n_p0;
    newBubble.n_p1 = $bubble.n_p1;
    newBubble.initOptions();
    newBubble.text = text.slice(cursor).trimStart();
    findBubblePage($mainBook, $bubble).bubbles.push(newBubble);

    $bubble.text = text.slice(0, cursor).trimEnd();

    const c0: Vector = [center[0] + width / 2, center[1]];
    const c1: Vector = [center[0] - width / 2, center[1]];
    if ($bubble.direction === 'v') {
      $bubble.setPhysicalCenter(paperSize, c0);
      newBubble.setPhysicalCenter(paperSize, c1);
    } else {
      $bubble.setPhysicalCenter(paperSize, c1);
      newBubble.setPhysicalCenter(paperSize, c0);
    }

    commit(null);
    $bubble = newBubble;
  }

  function findBubblePage(book: Book, bubble: Bubble) {
    for (const page of book.pages) {
      if (page.bubbles.includes(bubble)) {
        return page;
      }
    }
    return null;
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

  function modalScribble(page: Page, element: FrameElement) {
    toolTipRequest.set(null);
    painter.start(page, element);
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

<Painter bind:this={painter} on:done={() => commit(null)} bind:layeredCanvas bind:arrayLayer/>

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>