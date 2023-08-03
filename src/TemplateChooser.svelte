<script lang="ts">
  import { onMount } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import Paper from './Paper.svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import { createEventDispatcher } from 'svelte';
  import type { Page } from './pageStore'
  import { FrameElement } from './lib/layeredCanvas/frameTree.js';

  let swiper;

  register();

  const dispatch = createEventDispatcher();

  function handleClick(frame) {
    dispatch('apply', frame);
  }

  function makePage(frame): Page {
    return {
      revision: { id: "template", revision: 1 },
      frameTree: FrameElement.compile(frame),
      bubbles: [],
      paperSize: [140, 198],
      paperColor: '#888888',
      frameColor: '#444400',
      frameWidth: 1,
    };    
  }

  let style;
  onMount(() => {
    // なぜか後刺ししないとうまく動かない
    style = "height: 100%;";
  });
</script>

<div class="template-selector rounded-container-token">
  <swiper-container style="{style}" navigation="true" pagination="true" slides-per-view="2" centered-slides="true" grab-cursor="true" bind:this={swiper}>
    {#each frameExamples as frame}
      <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;">
        <Paper page={makePage(frame)} on:click={()=>handleClick(frame)}/>
      </swiper-slide>
    {/each}
  </swiper-container>
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