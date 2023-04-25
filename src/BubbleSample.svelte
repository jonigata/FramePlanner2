<script type="ts">
  import { onMount } from 'svelte';
  import { drawBubble } from "./lib/layeredCanvas/bubbleGraphic.js";
  import { createEventDispatcher } from 'svelte';

  export let width = 64;
  export let height = 96;
  export let shape = 'rounded';

  let canvas;

  const dispatch = createEventDispatcher();

  onMount(() => {
    redraw(shape);
  });

  function click(e) {
    console.log('click');
    dispatch('click', e);
  }

  $: redraw(shape);
  function redraw(p) {
    if (!canvas) return;

    const opts = {
      tailTip: [-width*0.5, height*0.4],
      tailMid: [0.5, 0],
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.bubbleDrawMethod = "fill";
    drawBubble(ctx, 'sample', [8, 8, canvas.width - 16, canvas.height - 16], p, opts);
    ctx.bubbleDrawMethod = "stroke";
    drawBubble(ctx, 'sample', [8, 8, canvas.width - 16, canvas.height - 16], p, opts);
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
