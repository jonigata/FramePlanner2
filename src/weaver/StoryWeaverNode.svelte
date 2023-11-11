<script lang="ts">
  import { Handle, Position, type NodeProps, useEdges } from '@xyflow/svelte';
  import { type WeaverNode, weaverNodeInputType, weaverNodeOutputType } from './weaverStore';
  import "./nodes.postcss";

  type $$Props = NodeProps;

  export let data: $$Props['data'];
  export let isConnectable: $$Props['isConnectable'];
  export let id: $$Props['id'];

  let model: WeaverNode = data.model;
  let isInputConnectable = isConnectable;
  let isOutputConnectable = isConnectable;

  const edges = useEdges();
/*
  $: isInputConnectable = $edges.filter((edge) => edge.target === id).length < 1;
  $: isOutputConnectable = $edges.filter((edge) => edge.source === id).length < 1;
*/
</script>

{#each model.injectors as injector}
  <Handle
    id="{injector.id}"
    type="target"
    position={Position.Top}
    isConnectable={isInputConnectable}
    class={weaverNodeInputType[model.type]}
    style="z-index: 1000;"
    on:connectstart on:connect on:connectend
  />
  <!-- on:xxx はbubbling -->
  {/each}

<div class="container {model.type} {model.state}">
  {model.label}
</div>

{#each model.extractors as extractor}
  <Handle
    id="{extractor.id}"
    type="source"
    position={Position.Bottom}
    isConnectable={isOutputConnectable}
    class={weaverNodeOutputType[model.type]}
    style="z-index: 1000;"
    on:connectstart on:connect on:connectend
  />
  <!-- on:xxx はbubbling -->
{/each}

<style lang="postcss">
  .container {
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
    position: relative;
  }
</style>  