<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import TemplateSample from './TemplateSample.svelte';
  import { Splide, SplideSlide, type Options } from '@splidejs/svelte-splide';
  import '@splidejs/svelte-splide/css';
  // import '@splidejs/splide/css/skyblue';

  const dispatch = createEventDispatcher();

  const swiperOptions: Options = {
    fixedWidth: 150,
    focus: 'center', 
    trimSpace: false, 
    arrows: true, 
    pagination: true, 
    pagenationDirection: 'ltr' 
  };

  function onSlideChange(e) { // : CustomEvent<SlideEventDetail>
    dispatch('change', e.detail.Slide.index);
  }

  function onClick(e: CustomEvent<{ frameTree: any, bubbles: any }>) {
    dispatch('apply', e.detail);
  }

  const onProgress = (e) => {
    const [swiper, progress] = e.detail;
    console.log(progress)
  };

  let style: string = null;
  onMount(() => {
    // なぜか後刺ししないとうまく動かない
    style = "height: 100%;";
  });
</script>

<div class="template-selector rounded-container-token">
  <Splide options={swiperOptions} on:active={onSlideChange}>
    {#each frameExamples as sample}
      <SplideSlide style="height: 100%;display: flex;align-items: center;justify-content: center;">
        <TemplateSample sample={sample} on:click={onClick}/>
      </SplideSlide>
    {/each}
  </Splide>
</div>

<style>
  .template-selector {
    background-color: #98bedd;
    position: relative;
    padding-top: 8px;
    padding-bottom: 8px;
  }
</style>