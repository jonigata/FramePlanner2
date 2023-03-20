<script>
  import { onMount } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import BubbleSample from './BubbleSample.svelte';

  export let paperWidth = '96px';
  export let paperHeight = '96px';
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
  <swiper-container style="{style}" navigation="true" pagination="true">
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'square'} on:click={()=>choose('square')}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'rounded'} on:click={()=>choose('rounded')}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'ellipse'} on:click={()=>choose('ellipse')}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'strokes'} on:click={()=>choose('strokes')}/></swiper-slide>
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