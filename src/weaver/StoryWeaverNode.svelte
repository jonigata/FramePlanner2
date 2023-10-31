<script lang="ts">
  import { Node, Anchor, type CSSColorString } from 'svelvet';
  import type { WeaverDataType, WeaverNodeType, WeaverNode } from './weaverStore';
  import { createEventDispatcher, onMount, setContext, tick } from 'svelte';
  import StoryWeaverNodeHelper from './StoryWeaverNodeHelper.svelte';
  import { modeOsPrefers } from '@skeletonlabs/skeleton';

  const dispatch = createEventDispatcher();

  export let position: {x: number, y: number};
  export let state: 'empty' | 'filled' | 'ready' = 'empty';
  export let model: WeaverNode;

  let helper: StoryWeaverNodeHelper;

  $: onStateChanged(model);
  function onStateChanged(model) {
    console.log("onStateChanged", model.links);
    if (model.data) {
      state = 'filled';
    } else {
      if (model.ready) {
        state = 'ready';
      } else {
        state = 'empty';
      }
    }
  }

  const dataColor: {[key: string]: CSSColorString} = {
    draft: 'red',
    storyboard: 'blue',
  }

  function onNodeClicked(e) {
    console.log("onNodeClicked");
    dispatch('nodeClicked', model);
  }

</script>

<Node 
  id={model.id} position={position} dynamic={true}
  on:nodeClicked={onNodeClicked} 
  let:connect
  let:disconnect TD>
  <StoryWeaverNodeHelper connector={connect} disconnector={disconnect} bind:this={helper}/>
  <div class="node {model.type} {state}">
    {model.label}
  </div>
  {#each model.injectors as dt}
    <Anchor id={dt.id} bgColor={dataColor[dt.type]} direction="north" input/>
  {/each}
  {#each model.extractors as dt}
    <Anchor id={dt.id} bgColor={dataColor[dt.type]} direction="south" connections={model.outputs} output/>
  {/each}
</Node>

<style lang="postcss">
  .node {
    @apply rounded-container-token;
    width: 200px;
    height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: '源暎エムゴ';
    font-size: 22px;
    gap: 20px;
  }
  .reset-button {
    width: 70px;
    @apply bg-secondary-500 text-white;
    font-family: 'Noto Sans JP';
    font-size: 14px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .run-button {
    width: 70px;
    @apply bg-secondary-500 text-white;
    font-family: 'Noto Sans JP';
    font-size: 14px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .drafter.empty {
    @apply variant-soft-primary;
  }
  .storyboarder.empty {
    @apply variant-soft-secondary;
  }
  .generator.empty {
    @apply variant-soft-tertiary;
  }
  .drafter.filled {
    @apply variant-filled-primary;
  }
  .storyboarder.filled {
    @apply variant-filled-secondary;
  }
  .generator.filled {
    @apply variant-filled-tertiary;
  }
  .drafter.ready {
    @apply variant-ghost-primary;
  }
  .storyboarder.ready {
    @apply variant-ghost-secondary;
  }
  .generator.ready {
    @apply variant-ghost-tertiary;
  }
</style>  