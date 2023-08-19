<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { fileManagerDragging } from "./fileManagerStore";
  import type { BindId } from "./lib/filesystem/fileSystem";

  const dispatch = createEventDispatcher()

  export let index: number;
  export let path;

  let isDraggingOver = false;
  let acceptable = false;

  $: ondrag($fileManagerDragging);
  function ondrag(dragging) {
    if (dragging) {
      console.log("file ondrag", path, dragging.bindId);
    }
    acceptable = dragging && !path.includes(dragging.bindId);
  }

  function onDragOver(ev) {
    const bindId = ev.dataTransfer.getData("bindId") as string as BindId;
    console.log("tail dropzone dragover", path, "bindId = ", bindId, ";");
    if (path.includes(bindId)) { return; }

    ev.preventDefault();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  function onDrop(ev) {
    ev.preventDefault();
    isDraggingOver = false;
    console.log('drop');
    const detail = { dataTransfer: ev.dataTransfer, index };
    dispatch('insert', detail);
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

</script>

<div class="tail">
  <div 
    class="drop-zone"
    class:dragging={acceptable}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
    style="z-index: {path.length}"
  >
    <div
      class="insert-line"
      class:dragging={isDraggingOver}
    >
    </div>
  </div>
</div>

<style>
  .tail {
    position: relative;
    height: 0px;
  }
  .drop-zone {
    background-color: #88e;
    border: 1px dashed #ccc;
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    width: 100%;

    height: 20px;
    z-index: 1;
    display: none;
  }

  .drop-zone.dragging {
    display: block;
  }

  .insert-line {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: black;
    transform: translateY(-50%);  /* 縦中央に配置 */
    opacity: 0;
    pointer-events: none;
  }

  .dragging {
    opacity: 1;
  }
</style>
