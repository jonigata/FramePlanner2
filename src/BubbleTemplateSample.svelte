<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Bubble } from "./lib/layeredCanvas/dataModels/bubble.js";
  import { drawBubble } from "./lib/layeredCanvas/tools/draw/bubbleGraphic";
  import trashIcon from './assets/trash.png';

  export let width = 64;
  export let height = 96;
  export let bubble: Bubble;

  let canvas: HTMLCanvasElement;

  const dispatch = createEventDispatcher();

  onMount(async () => {
    const opts = {...bubble.optionContext};
    const p = bubble.shape;

    opts['tailTip'] = [-width*0.5, height*0.4];
    opts['tailMid'] = [0.5, 0];

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(width * 0.5, height * 0.5);
    ctx.fillStyle = bubble.hasEnoughSize() ? bubble.fillColor : "rgba(255, 128, 0, 0.9)";;
    ctx.strokeStyle = 0 < bubble.strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.strokeWidth / 2;
    ctx["bubbleDrawMethod"] = "fill";
    drawBubble(ctx, 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    ctx["bubbleDrawMethod"] = "stroke";
    drawBubble(ctx, 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    ctx.restore();
  });

  function click(e: MouseEvent) {
    console.log('click');
    dispatch('click', e);
  }
</script>

<div class="canvas-container" style="width: {width}px; height: {height}px;">
  <canvas width="{width}px" height="{height}px" bind:this={canvas} on:click={click}/>

  <!-- svelte-ignore a11y-missing-attribute -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <img class="trash" src={trashIcon} on:click={() => dispatch('delete')}/>
</div>

<style>
  .canvas-container {
    position: relative;
    background-image: linear-gradient(45deg, #b9c 25%, transparent 25%, transparent 75%, #b9c 75%, #b9c),
                      linear-gradient(45deg, #b9c 25%, transparent 25%, transparent 75%, #b9c 75%, #b9c);
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
  .trash { 
    position: absolute;
    top: 0;
    right: 0;
    width: 24px;
    height: 24px;
    cursor: pointer;
  }
</style>
