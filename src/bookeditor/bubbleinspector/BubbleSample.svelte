<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
  import { drawBubble, getBubbleName } from "../../lib/layeredCanvas/tools/draw/bubbleGraphic";
  import type { Vector } from "../../lib/layeredCanvas/tools/geometry/geometry";

  export let size: Vector = [64, 96];
  export let shape = 'rounded';

  let canvas: HTMLCanvasElement;
  let displayName = '？？';

  const dispatch = createEventDispatcher();

  onMount(() => {
    displayName = getBubbleName(shape);
    redraw(shape);
  });

  function click(e: MouseEvent) {
    console.log('click');
    dispatch('click', e);
  }

  $: redraw(shape);
  function redraw(p: string) {
    if (!canvas) return;

    const opts = Bubble.getInitialOptions({ shape, size }, true);

    opts.tailTip = [-size[0]*0.5, size[1]*0.4];
    opts.tailMid = [0.5, 0];

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(size[0] * 0.5, size[1] * 0.5);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    drawBubble(ctx, "fill", 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    drawBubble(ctx, "stroke", 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    ctx.restore();
  }

</script>

<div class="canvas-container" style="width: {size[0]}px; height: {size[1]}px;">
  <canvas width="{size[0]}px" height="{size[1]}px" bind:this={canvas} on:click={click}/>
  <span class="caption">{displayName}</span>
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
  .caption {
    position: absolute;
    font-size: 12px;
    color: rgb(8, 7, 75);
    bottom: 0;
    width: 100%;
    text-align: center;
    -webkit-text-stroke: 0.4px #ddd;    
    font-family: '源暎エムゴ';
    height: 18px;
  }
</style>
