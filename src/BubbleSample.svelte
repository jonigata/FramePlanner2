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

<canvas width="{width}px" height="{height}px" bind:this={canvas} on:click={click}/>

<style>
  canvas {
    cursor: pointer;
  }
</style>
