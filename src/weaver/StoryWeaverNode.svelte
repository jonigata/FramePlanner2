<script lang="ts">
  import { Node, Anchor, type CSSColorString } from 'svelvet';
  import type { WeaverDataType, WeaverNodeType, WeaverNode } from './weaverStore';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let position: {x: number, y: number};
  export let state: 'empty' | 'filled' | 'ready' = 'empty';
  export let model: WeaverNode;

  $: onStateChanged(model);
  function onStateChanged(model) {
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

<Node id={model.id} position={position} inputs={model.inputs.length} outputs={model.outputs.length} connections={model.linkTo} on:nodeClicked={onNodeClicked}>
  <div class="node {model.type} {state}">
    {model.label}
<!--
    <div class="hbox gap-2">
      <button class="reset-button" on:click={() => dispatch("reset", model)}>
        リセット
      </button>
      <button class="run-button" on:click={() => dispatch('run', model)}>
        実行
      </button>
    </div>
-->
  </div>
  {#each model.inputs as dt}
    <Anchor bgColor={dataColor[dt]} direction="north" dynamic={true} input/>
  {/each}
  {#each model.outputs as dt}
    <Anchor bgColor={dataColor[dt]} direction="south" dynamic={true} output/>
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