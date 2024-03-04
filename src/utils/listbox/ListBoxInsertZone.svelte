<script lang="ts">
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  export let zoneHeight = 0;
  export let insertPosition = 0;
  export let index = -1;

  export let zone;
  export let active = false;

  const dragCursor = getContext('dragCursor') as Writable<number>;

  $: onDragCursorChange(index, $dragCursor);
  function onDragCursorChange(i:number, c: number) {
    console.log(c, i);
    active = c != null && i == c;
  }

</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="insert-zone"
  style="--zone-height: {zoneHeight}px; --insert-position: {insertPosition}px;"
  draggable={false}
  bind:this={zone}>
  <div class="insert-line custom-insert-line" class:active={active}>
  </div>
</div>

<style>
  .insert-zone {
    position: absolute;
    width: 100%;
    height: var(--zone-height);
    bottom: 50%;
    z-index: 100;
    /* border: 1px dashed #000; */
    pointer-events: none;
  }
  .insert-line {
    /* 外部から変更してほしくないものはこちら */
    position: absolute;
    bottom: var(--insert-position);
    opacity: 0;
    pointer-events: none;
    left: 0;
    right: 0;
    height: 3px;
    background-color: blue;
  }
  .custom-insert-line {
    background-color: blue; /* カラだとエラーになる */
  }
  .insert-line.active {
    opacity: 1;
  }
</style>

    