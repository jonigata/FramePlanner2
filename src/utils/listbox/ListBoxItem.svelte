<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import ListBoxInsertZone from './ListBoxInsertZone.svelte';

  type RegisterChildReuslt = {
    index: number;
    zoneHeight: number;
    gap: number;
  };

  type Handlers = {
    register: (item: HTMLElement, zone: HTMLElement, transferTo: number) => RegisterChildReuslt;
    unregister: (item: HTMLElement) => void;
  }

  const retrieveHandlers = getContext('retrieveHandlers') as () => Handlers;
  const handlers = retrieveHandlers();

  export let insertable: boolean = true;
  export let draggable: boolean = true;
  export let transferTo: number = -1;

  let item;
  let zone;
  let index = -1;
  let zoneHeight = 0;
  let insertPosition = 0;

	function onDragStart (ev: DragEvent) {
		ev.dataTransfer.setData("text/list-item", index.toString());
    ev.stopPropagation();
  }

  function onDragEnd() {
  }

  function onMouseDown(e: MouseEvent) {
    if (!draggable) {
      e.preventDefault();
    }
  }

  onMount(() => {
    const r = handlers.register(item, zone, transferTo);
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
<div class="item" bind:this={item}>
  {#if insertable}
    <ListBoxInsertZone zoneHeight={zoneHeight} insertPosition={insertPosition} bind:zone={zone} bind:index={index}/>
  {/if}
  <div 
    on:dragstart={onDragStart}
    on:dragend={onDragEnd}
    on:mousedown={(onMouseDown)}
    draggable={draggable}>
    <slot/>
  </div>
</div>

<style>
  .item {
    position: relative;
  }
</style>