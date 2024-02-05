<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from "svelte";
  import { LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas'
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';

  const dispatch = createEventDispatcher();

  export let sample: { frameTree: any, bubbles: any };

  let canvas: HTMLCanvasElement;

  function onClick() {
    dispatch('click', sample);
  }

  onMount(() => {
    const viewport = new Viewport(canvas, (p: [number, number], s: String) => {});
    const layeredCanvas = new LayeredCanvas(
      viewport, 
      false);

    const paperRendererLayer = new PaperRendererLayer();
    layeredCanvas.rootPaper.size = [140, 198];
    layeredCanvas.rootPaper.addLayer(paperRendererLayer);

    paperRendererLayer.setFrameTree(FrameElement.compile(sample.frameTree));
    paperRendererLayer.setBubbles([]);
    layeredCanvas.redraw();

    canvas.addEventListener('click', onClick);
  });

  onDestroy(() => {
    canvas.removeEventListener('click', onClick);
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