<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { bubble, bubbleInspectorPosition, bubbleSplitCursor } from './bubbleinspector/bubbleInspectorStore';
  import type { Book, Page, BookOperators, HistoryTag } from './book';
  import { undoBookHistory, redoBookHistory, commitBook, revertBook, newPage } from './book';
  import { mainBook, bookEditor, viewport } from './bookStore';
  import { buildBookEditor } from './bookEditorUtils';
  import AutoSizeCanvas from './AutoSizeCanvas.svelte';
  import { DelayedCommiter } from '../utils/cancelableTask';

  let canvas: HTMLCanvasElement;
  let layeredCanvas : LayeredCanvas;
  let book: Book = null;
  let painterActive = false;
  let bubbleSnapshot: string = null;
  let delayedCommiter = new DelayedCommiter(
    () => {
      console.log("commiting");
      commit("bubble"); 
      layeredCanvas.redraw(); 
    });

  $: book = $mainBook;

  $: if ($viewport && !$viewport.dirty) {
    console.log("BookEditor", $viewport);    
    $viewport.dirty = true;
    $viewport = $viewport;
    layeredCanvas?.redraw();
  }

  function isPainting() {
    return painterActive;
  }

  function hint(p: [number, number], s: String) {
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
    commitBook(book, tag);
    console.tag("commit", "cyan", book.revision, book.history.entries[book.history.cursor-1])
  }

  function revert() {
    console.log("revert");
    delayedCommiter.cancel();
    revertBook(book);
  }

  function undo() {
    if (isPainting()) {
      // inlinePainterLayer.undo(); // TODO
    } else {
      undoBookHistory(book);
      revert();
    }
  }

  function redo() {
    if (isPainting()) {
      // inlinePainterLayer.redo(); // TODO
    } else {
      redoBookHistory(book);
      revert();
    }
  }

  function viewportChanged() {
    console.log("viewportChanged");
    $viewport = $viewport;
  }

  function insertPage(index: number) {
    console.log("insertPage", index);
    const frameTree = FrameElement.compile(frameExamples[0]);
    const page = newPage(frameTree);
    $mainBook.pages.splice(index+1, 0, page);
    book = $mainBook;
  }

  function deletePage(index: number) {
    console.log("deletePage", index);
  }

  $: onChangeBook(canvas, book);
  function onChangeBook(canvas, book) {
    if (!canvas || !book) { return; }

    console.log("*********** buildBookEditor from BookEditor");
    if (layeredCanvas) {
      layeredCanvas.cleanup();
    }

    if (!$viewport) {
      console.log("================ viewport remake");
      $viewport = new Viewport(canvas, hint);
    }
    $viewport.dirty = true;
    
    const bookEditorInstance: BookOperators = {
      hint,
      commit,
      revert,
      undo,
      redo,
      modalGenerate: () => {},
      modalScribble: () => {},
      insert: () => {},
      splice: () => {},
      focusBubble,
      viewportChanged,
      insertPage,
      deletePage,
    };
    $bookEditor = bookEditorInstance;

    layeredCanvas = buildBookEditor(
      $viewport,
      book.pages,
      $bookEditor);
    layeredCanvas.redraw();
  }

  $: onBubbleModified($bubble);
  function onBubbleModified(bubble: Bubble) {
    if (!layeredCanvas) { return; }

    console.log("bubble changed");
    layeredCanvas.redraw();

    if (bubbleSnapshot && bubble) {
      const snapshot = JSON.stringify(Bubble.decompile([512, 512], bubble));
      if (bubbleSnapshot !== snapshot) {
        console.log("bubbleSnapshot actually changed");
        delayedCommiter.schedule(2000);
        setTimeout(() => layeredCanvas.redraw(), 5000);
      }
    }
  }

  function focusBubble(page: Page, bubble: Bubble, p: Vector) {
    console.log("focusBubble");
    delayedCommiter.force();
    if (bubble) {
      const [cx, cy] = p;
      const offset = canvas.height / 2 < cy ? -1 : 1;
      
      bubbleSnapshot = JSON.stringify(Bubble.decompile([512, 512], bubble)); // サイズは比較時に合致してればいいので適当に
      $bubble = bubble;
      $bubbleInspectorPosition = {
        center: convertPointFromNodeToPage(canvas, cx, cy),
        height: bubble.size[1],
        offset
      };
    } else {
      console.log("hiding");
      bubbleSnapshot = null;
      $bubble = null;
    }
  }

  onDestroy(() => {
    layeredCanvas.cleanup();
  });

  function onResize(e: CustomEvent) {
    console.log("onResize", e.detail);
    if (!layeredCanvas || !$viewport) { return; }
    $viewport.dirty = true;
    layeredCanvas.redraw();
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

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>