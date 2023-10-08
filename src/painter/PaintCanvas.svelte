<script lang="ts">
  import { onMount } from "svelte";
  import { LayeredCanvas, sequentializePointer } from '../lib/layeredCanvas/layeredCanvas.js'
  import { PainterLayer } from '../lib/layeredCanvas/painterLayer.js';

  export let width = 512;
  export let height = 512;
  export let pen = { strokeStyle: "black", lineWidth: 5 };

  let containerWidth: number;
  let containerHeight: number;
  let canvas: HTMLCanvasElement;
  let layeredCanvas: any;
  let painterLayer: any;

  $: onChangePen(pen);
  function onChangePen(pen: { strokeStyle: string, lineWidth: number }) {
    console.log("onChangePen", pen);
    if (painterLayer) {
      painterLayer.currentPen = pen;
    }
  }

  onMount(() => {
    layeredCanvas = new LayeredCanvas(
        canvas, 
        [width, height],
        (_p: [number, number], _s: string) => {
        });

    sequentializePointer(PainterLayer);
    painterLayer = new PainterLayer();
    layeredCanvas.addLayer(painterLayer);
    painterLayer.snapshot();
    layeredCanvas.redraw();
  });

</script>

<div class="canvas-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <canvas bind:this={canvas} width={containerWidth} height={containerHeight}/>
</div>

<style>
  .canvas-container {
    position: relative;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
    width: 100%;
    height: 100%;
  }
</style>