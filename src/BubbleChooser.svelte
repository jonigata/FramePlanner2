<script>
  import { onMount } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import BubbleSample from './BubbleSample.svelte';

  export let paperWidth = '96px';
  export let paperHeight = '96px';

  let style;
  onMount(() => {
    // なぜか後刺ししないとうまく動かない
    style = "height: 100%;";
  });
</script>

<div class="sample-selector rounded-container-token">
  <swiper-container style="{style}" navigation="true" pagination="true">
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'rounded'}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'square'}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'ellipse'}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><BubbleSample width={paperWidth} height={paperHeight} pattern={'strokes'}/></swiper-slide>
  </swiper-container>
  <img id="load-frame-template" src="/src/assets/get.png" alt="get" />
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