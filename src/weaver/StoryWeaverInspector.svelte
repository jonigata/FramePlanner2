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

  const selected = getContext('selected') as Writable<WeaverNode>;

  $: model = $selected;

</script>

<div class="container">
  {#if model}
    <StoryWeaverInspectorContent model={model}/>
  {/if}
</div>

<style>
</style>
