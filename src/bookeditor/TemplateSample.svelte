<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from "svelte";
  import { LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas'
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';

  const dispatch = createEventDispatcher();
  const size = [140, 198];

  export let sample: { frameTree: any, bubbles: any };

  let canvas: HTMLCanvasElement;

  function onClick() {
    dispatch('click', sample);
  }

  onMount(() => {
    const viewport = new Viewport(canvas, (r: [number, number, number, number], s: String) => {});
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

<div class="canvas-container" style="width: {size[0]}px; height: {size[1]}px;">
  <canvas width="{size[0]}" height="{size[1]}" bind:this={canvas} on:click={onClick}/>
</div>

<style>
  .canvas-container {
    position: relative;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
  }
</style>