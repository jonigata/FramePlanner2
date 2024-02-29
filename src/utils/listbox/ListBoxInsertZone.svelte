<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let zoneHeight = 0;
  export let insertPosition = 0;

  let item;
  let isDraggingOver = false;

  const dispatch = createEventDispatcher();

  async function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  function onDrop(ev: DragEvent) {
    isDraggingOver = false;
    dispatch("drop");
    ev.preventDefault();
    ev.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="insert-zone"
  style="--zone-height: {zoneHeight}px; --insert-position: {insertPosition}px;"
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  bind:this={item}>
  <div
    class="insert-line"
    class:dragging={isDraggingOver}
  >
  </div>
</div>

<style>
  .insert-zone {
    position: absolute;
    width: 100%;
    height: var(--zone-height);
    bottom: 50%;
    z-index: 100;
    border: 1px dashed #000;
  }
  .insert-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    bottom: var(--insert-position);
    background-color: blue;
    opacity: 1;
    pointer-events: none;
  }
  .dragging {
    opacity: 1;
  }
</style>

    