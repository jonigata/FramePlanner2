<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import ListBoxInsertZone from './ListBoxInsertZone.svelte';

  type RegisterChildReuslt = {
    index: number;
    zoneHeight: number;
    gap: number;
  };

  type Handlers = {
    register: (item: HTMLElement) => RegisterChildReuslt;
    unregister: (item: HTMLElement) => void;
    onImport: (a: { index: number, files: FileList}) => void,
    onMove: (a: { index: number, sourceIndex: number}) => void,
  }

  const retrieveHandlers = getContext('retrieveHandlers') as () => Handlers;
  const handlers = retrieveHandlers();

  export let insertable: boolean = true;
  export let draggable: boolean = true;

  let item;
  let index = -1;
  let zoneHeight = 0;
  let insertPosition = 0;

	async function onDragStart (ev: DragEvent) {
    console.log(index);
		ev.dataTransfer.setData("text/list-item", index.toString());
    ev.stopPropagation();
	}

  function onMouseDown(e: MouseEvent) {
    if (!draggable) {
      e.preventDefault();
    }
  }

  function onImport(e: CustomEvent<FileList>) {
    handlers.onImport({ index, files: e.detail });
  }

  function onMove(e: CustomEvent<number>) {
    handlers.onMove({ index, sourceIndex: e.detail });
  }

  onMount(() => {
    const r = handlers.register(item);
    index = r.index;
    zoneHeight = r.zoneHeight;
    const height = item.getBoundingClientRect().height;
    insertPosition = height / 2 + r.gap / 2;
  });

  onDestroy(() => {
    handlers.unregister(item);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="item" 
  on:dragstart={onDragStart}
  on:mousedown={(onMouseDown)}
  bind:this={item} 
  draggable={draggable}>
  {#if insertable}
    <ListBoxInsertZone zoneHeight={zoneHeight} insertPosition={insertPosition} on:import={onImport} on:move={onMove}/>
  {/if}
  <slot/>
</div>

<style>
  .item {
    position: relative;
  }
</style>