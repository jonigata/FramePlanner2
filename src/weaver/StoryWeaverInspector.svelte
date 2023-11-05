<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { WeaverNode } from './weaverStore';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import StoryWeaverInspectorContent from './StoryWeaverInspectorContent.svelte';

  type $$Props = NodeProps;

  export let data: $$Props['data'];
  let model: WeaverNode = data.model;
  let _dummy = $$restProps; // warningがうるさいので
  let key = 0;

  const selected = getContext('selected') as Writable<WeaverNode>;

  $: model = $selected;
  $: if (model) { key++; console.log(key); }

</script>

<div class="container">
  {#if model}
    <div class="label drag-handle">{model.label}</div>
    {#key key}
      <StoryWeaverInspectorContent model={model}/>
    {/key}
  {/if}
</div>

<style lang="postcss">
  .container {
    @apply rounded-container-token variant-glass-surface;
    width: 500px;
    display: flex;
    flex-direction: column;
    padding: 8px;
  }
  .label {
    @apply variant-filled-surface rounded-container-token;
    height: 32px;
    cursor: move;
    align-self: stretch;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Noto Sans JP';
    font-size: 16px;
  }
</style>
