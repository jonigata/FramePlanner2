<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import ListBoxInsertZone from './ListBoxInsertZone.svelte';

  type RegisterChildReuslt = {
    index: number;
    zoneHeight: number;
    gap: number;
  };

  type Registerer = {
    register: (item: HTMLElement) => RegisterChildReuslt;
    unregister: (item: HTMLElement) => void;
  }

  const retrieveRegisterer = getContext('retrieveRegisterer') as ()=>Registerer;
  const registerer = retrieveRegisterer();

  export let insertable: boolean = true;

  let item;
  let zoneHeight = 0;
  let insertPosition = 0;

  onMount(() => {
    const r = registerer.register(item);
    zoneHeight = r.zoneHeight;
    const height = item.getBoundingClientRect().height;
    insertPosition = height / 2 + r.gap / 2;
  });

  onDestroy(() => {
    registerer.unregister(item);
  });
</script>

<div class="item" bind:this={item}>
  {#if insertable}
    <ListBoxInsertZone zoneHeight={zoneHeight} insertPosition={insertPosition}/>
  {/if}
  <slot/>
</div>

<style>
  .item {
    position: relative;
  }
</style>