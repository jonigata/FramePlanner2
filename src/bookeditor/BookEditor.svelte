<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { bubble, bubbleInspectorPosition, bubbleSplitCursor } from './bubbleinspector/bubbleInspectorStore';
  import { type Page, type BookOperators, undoPageHistory, redoPageHistory, commitPage, revertPage } from './book';
  import { mainBook, mainPage, bookEditor } from './bookStore';
  import { buildBookEditor } from './bookEditorUtils';
  import AutoSizeCanvas from './AutoSizeCanvas.svelte';

  let canvas: HTMLCanvasElement;
  let layeredCanvas : LayeredCanvas;
  let book = $mainBook;
  let bubbleSnapshot: string = null;
  let painterActive = false;

  function isPainting() {
    return painterActive;
  }

  function onHint(p: [number, number], s: String) {
    if (s) {
      const q = convertPointFromNodeToPage(canvas, ...p);
      q.y -= 25;
      toolTipRequest.set({ message: s, position: q });
    } else {
      toolTipRequest.set(null);
    }
  }

  // TODO: alwaysフラグ無視してる
  // TODO: bubbleのsnapshotのこと忘れてる
  export function commit(page: Page, tag: string) {
    commitPage(page, tag);
    console.tag("commit", "cyan", page.revision, page.history[page.historyIndex-1])
    console.log([...page.history], page.historyIndex)
  }

  function revert(page: Page) {
    console.log("revert");
    revertPage(page);
  }

  function undo(page: Page) {
    if (isPainting()) {
      // inlinePainterLayer.undo(); // TODO
    } else {
      undoPageHistory(page);
      revert(page);
    }
  }

  function redo(page: Page) {
    if (isPainting()) {
      // inlinePainterLayer.redo(); // TODO
    } else {
      redoPageHistory(page);
      revert(page);
    }
  }

  $: if (canvas) {
    console.log("*********** buildBookEditor from BookEditor");
    if (layeredCanvas) {
      layeredCanvas.cleanup();
    }

    const bookEditorInstance: BookOperators = {
      hint: onHint,
      commit: (page: Page, tag: string) => commit(page, tag),
      revert: (page: Page) => revert(page),
      undo: undo,
      redo: redo,
      modalGenerate: () => {},
      modalScribble: () => {},
      insert: () => {},
      splice: () => {},
      focusBubble
    };
    $bookEditor = bookEditorInstance;

    layeredCanvas = buildBookEditor(
      canvas, 
      book.pages,
      $bookEditor);
    layeredCanvas.redraw();
  }

  $: if ($bubble && layeredCanvas) {
    layeredCanvas.redraw();
    // フォント読み込みが遅れるようなのでヒューリスティック
    setTimeout(() => layeredCanvas.redraw(), 2000);
    setTimeout(() => layeredCanvas.redraw(), 5000);
  }

  function focusBubble(page: Page, bubble: Bubble, p: Vector) {
    console.log("focusBubble");
    if (bubble) {
      const [cx, cy] = p;
      const offset = canvas.height / 2 < cy ? -1 : 1;
      
      bubbleSnapshot = JSON.stringify(Bubble.decompile(page.paperSize, bubble));
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

</script>

<div class="main-paper-container">
  <AutoSizeCanvas bind:canvas={canvas}>
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