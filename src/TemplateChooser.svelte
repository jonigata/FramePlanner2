<script>
  import { onMount } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import Paper from './Paper.svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';

  export let paperWidth = '140px';
  export let paperHeight = '198px';

  register();

  let style;
  onMount(() => {
    // なぜか後刺ししないとうまく動かない
    style = "height: 100%;";
  });
</script>

<div class="template-selector rounded-container-token">
  <swiper-container style="{style}" navigation="true" pagination="true">
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><Paper width={paperWidth} height={paperHeight} frameJson={frameExamples[0]}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><Paper width={paperWidth} height={paperHeight} frameJson={frameExamples[1]}/></swiper-slide>
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><Paper width={paperWidth} height={paperHeight} frameJson={frameExamples[2]}/></swiper-slide>
  </swiper-container>
  <img id="load-frame-template" src="/src/assets/get.png" alt="get" />
</div>

<style>
  .template-selector {
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