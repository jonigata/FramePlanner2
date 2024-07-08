<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let canvas: HTMLCanvasElement;

  let containerWidth: number;
  let containerHeight: number;
  let canvasWidth: number;
  let canvasHeight: number;

  const dispatch = createEventDispatcher();

  $:onChangeContainerSize(containerWidth, containerHeight);
  function onChangeContainerSize(w: number, h: number) {
    if (!w || !h) return;
    canvasWidth = w;
    canvasHeight = h;
    dispatch('resize', { width: w, height: h });
  }
</script>

<div class="canvas-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <canvas width={canvasWidth} height={canvasHeight} bind:this={canvas}/>
  <slot/>
</div>    


<style>
  .canvas-container {
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
    width: 100%;
    height: 100%;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    touch-action: none;
  }  
</style>