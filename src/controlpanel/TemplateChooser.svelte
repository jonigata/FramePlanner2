<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { register } from 'swiper/element/bundle';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import TemplateSample from './TemplateSample.svelte';

  register();

  const dispatch = createEventDispatcher();

  function onClick(e: CustomEvent<FrameElement>) {
    dispatch('apply', e.detail);
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
        <TemplateSample frameTree={FrameElement.compile(frame)} on:click={onClick}/>
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