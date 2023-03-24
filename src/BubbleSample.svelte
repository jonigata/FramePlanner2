<script type="ts">
  import { onMount } from 'svelte';
  import { drawBubble } from "./lib/layeredCanvas/bubbleGraphic.js";
  import { createEventDispatcher } from 'svelte';

  export let width = 64;
  export let height = 96;
  export let pattern = 'rounded';

  let canvas;

  const dispatch = createEventDispatcher();

  onMount(() => {
    // render
    const ctx = canvas.getContext("2d");
    // fill white
    ctx.fillStyle = "white";
    // stroke black
    ctx.strokeStyle = "black";
    drawBubble(ctx, 'sample', [8, 8, canvas.width - 16, canvas.height - 16], pattern);
  });

  function click() {
    console.log('click');
    dispatch('click');
  }

</script>

<div class="canvas-container" style="width: {width}px; height: {height}px;">
  <canvas width="{width}px" height="{height}px" bind:this={canvas} on:click={click}/>
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
