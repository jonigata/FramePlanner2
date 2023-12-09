<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import { FrameElement } from './lib/layeredCanvas/dataModels/frameTree';
  import { frameExamples } from './lib/layeredCanvas/tools/frameExamples';
  import type { Page } from './pageStore'
  import Paper from './Paper.svelte';

  register();

  const dispatch = createEventDispatcher();

  function handleClick(frame: any) {
    dispatch('apply', frame);
  }

  function makePage(frame: any): Page {
    return {
      revision: { id: "template", revision: 1, prefix: "template" },
      frameTree: FrameElement.compile(frame),
      bubbles: [],
      paperSize: [140, 198],
      paperColor: '#888888',
      frameColor: '#444400',
      frameWidth: 1,
      history: [],
      historyIndex: 0,
    };    
  }

  let style: string = null;
  onMount(() => {
    // なぜか後刺ししないとうまく動かない
    style = "height: 100%;";
  });
</script>

<div class="template-selector rounded-container-token">
  <swiper-container style="{style}" navigation="true" pagination="true" slides-per-view="2" centered-slides="true" grab-cursor="true">
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
</style>