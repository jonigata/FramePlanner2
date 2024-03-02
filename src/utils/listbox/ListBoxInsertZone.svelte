<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let zoneHeight = 0;
  export let insertPosition = 0;

  let item;
  let isDraggingOver = false;

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  async function onDrop(ev: DragEvent) {
    isDraggingOver = false;
    ev.preventDefault();
    ev.stopPropagation();
    const dt = ev.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      console.log("drop import");
      dispatch("import", files)
    } else {
      console.log("drop move");
      // 内部ドラッグ
      console.log(dt.getData("text/list-item"));
      const sourceIndex = parseInt(dt.getData("text/list-item"));
      dispatch("move", sourceIndex)
    }
  }

  function foo(e: DragEvent) {
    console.log("dragstart", e);
  }

</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="insert-zone"
  style="--zone-height: {zoneHeight}px; --insert-position: {insertPosition}px;"
  draggable={false}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  bind:this={item}>
  <div
    class="insert-line insert-line-position"
    class:dragging={isDraggingOver}
  >
  </div>
</div>

<svelte:document on:dragstart={foo}/>

<style>
  .insert-zone {
    position: absolute;
    width: 100%;
    height: var(--zone-height);
    bottom: 50%;
    z-index: 100;
    border: 1px dashed #000;
  }
  .insert-line-position {
    /* 外部から変更してほしくないものはこちら */
    position: absolute;
    bottom: var(--insert-position);
    opacity: 1;
    pointer-events: none;
  }
  .insert-line {
    left: 0;
    right: 0;
    height: 1px;
    background-color: blue;
  }
  .dragging {
    opacity: 1;
  }
</style>

    