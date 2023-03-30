<script>
  import { onMount } from 'svelte';
  import BubbleSample from './BubbleSample.svelte';

  export let paperWidth = 96;
  export let paperHeight = 96;
  export let selectedShape = 'square';

  let style;
  onMount(() => {
    // なぜか後刺ししないとうまく動かない
    style = "height: 100%;";
  });

  function choose(s) {
    console.log(s);
    selectedShape = s;
  }
</script>

<div class="sample-selector rounded-container-token">
  <swiper-container style="{style}" navigation="true" pagination="true" slides-per-view="3" centered-slides="true" grab-cursor="true">
    {#each ['square', 'rounded', 'soft', 'harsh', 'harsh-curve', 'ellipse', 'concentration', 'polygon', 'strokes', 'double-strokes', 'heart', 'diamond', 'none'] as s}
      <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={s} on:click={()=>choose(s)}/></swiper-slide>
    {/each}
  </swiper-container>
</div>

<style>
  .sample-selector {
    background-color: #98bedd;
    position: relative;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  #load-frame-template {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    width: 32px;
    height: 32px;
    cursor: pointer;
  }
</style>