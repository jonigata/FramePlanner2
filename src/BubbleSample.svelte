<script type="ts">
  import { onMount } from 'svelte';
  import { drawBubble } from "./lib/layeredCanvas/bubbleGraphic.js";
  import { createEventDispatcher } from 'svelte';
  import { Bubble } from "./lib/layeredCanvas/bubble.js";

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

    const opts = Bubble.getInitialOptions({ shape, size: [width, height] }, true);

    opts.tailTip = [-width*0.5, height*0.4];
    opts.tailMid = [0.5, 0];

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(width * 0.5, height * 0.5);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.bubbleDrawMethod = "fill";
    drawBubble(ctx, 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    ctx.bubbleDrawMethod = "stroke";
    drawBubble(ctx, 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    ctx.restore();
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
