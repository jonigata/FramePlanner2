<script lang="ts">
  import { onMount } from "svelte";
  import { LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas'
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';

  export let frameTree: FrameElement;

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const viewport = new Viewport(canvas, (p: [number, number], s: String) => {});
    const layeredCanvas = new LayeredCanvas(
      viewport, 
      false);

    const paperRendererLayer = new PaperRendererLayer();
    layeredCanvas.rootPaper.size = [140, 198];
    layeredCanvas.rootPaper.addLayer(paperRendererLayer);

    paperRendererLayer.setFrameTree(frameTree);
    paperRendererLayer.setBubbles([]);
    layeredCanvas.redraw();
  });
  
</script>

<div class="paper">
  <canvas class="paper-canvas" width="140" height="198" bind:this={canvas}></canvas>
</div>

<style>
  .paper {
    width: 140px;
    height: 198px;
  }

</style>