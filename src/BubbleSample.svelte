<script type="ts">
  import { onMount } from 'svelte';
  import { drawBubble } from "./lib/layeredCanvas/bubbleGraphic.js";
  import { createEventDispatcher } from 'svelte';

  export let width = '96px';
  export let height = '96px';
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

<canvas style="width: {width}; height: {height};" bind:this={canvas} on:click={click}/>

<style>
  canvas {
    cursor: pointer;
  }
</style>
