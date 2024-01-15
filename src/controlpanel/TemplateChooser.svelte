<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import TemplateSample from './TemplateSample.svelte';
  import { Splide, SplideSlide } from '@splidejs/svelte-splide';
  import '@splidejs/svelte-splide/css';

  register();

  function onSlideChange(e: CustomEvent<{activeIndex: number}>) {
    console.log(e.detail.activeIndex);
  }

  const dispatch = createEventDispatcher();

  function onClick(e: CustomEvent<FrameElement>) {
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
  <Splide options={{fixedWidth: 150, focus: 'center', trimSpace: false, arrows: true, pagination: true, pagenationDirection: 'ltr' }}>
    {#each frameExamples as frame}
      <SplideSlide style="height: 100%;display: flex;align-items: center;justify-content: center;">
        <TemplateSample frameTree={FrameElement.compile(frame)} on:click={onClick}/>
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