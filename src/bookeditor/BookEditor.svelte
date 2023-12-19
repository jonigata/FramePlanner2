<script lang="ts">
  import { onMount } from 'svelte';
  import { mainBook } from './bookStore';
  import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';
  import { toolTipRequest } from '../utils/passiveToolTipStore';
  import { buildBookEditor } from './bookEditorUtils';
  import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
  import { undoStore } from '../undoStore';
  import AutoSizeCanvas from './AutoSizeCanvas.svelte';

  let canvas: HTMLCanvasElement;
  let layeredCanvas : LayeredCanvas;
  let book = $mainBook;

  function onHint(p: [number, number], s: String) {
    if (s) {
      const q = convertPointFromNodeToPage(canvas, ...p);
      q.y -= 25;
      toolTipRequest.set({ message: s, position: q });
    } else {
      toolTipRequest.set(null);
    }
  }

  $: if (canvas) {
    console.log("*********** buildBookEditor from BookEditor");
    layeredCanvas = buildBookEditor(
      canvas, 
      book.pages,
      onHint,
      () => { $undoStore.redo(); },
      () => { $undoStore.undo(); });
    layeredCanvas.redraw();
  }
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