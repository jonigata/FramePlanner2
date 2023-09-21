<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { fileManagerDragging, type Dragging } from "./fileManagerStore";
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";

  const dispatch = createEventDispatcher()

  export let index: number;
  export let path: string[];

  let acceptable = false;

  $: ondrag($fileManagerDragging);
  function ondrag(dragging: Dragging) {
    if (dragging) {
      console.log("tail ondrag", path, dragging.bindId);
    }
    acceptable = dragging && !path.includes(dragging.bindId);
  }

  function onDrop(ev: CustomEvent<DataTransfer>) {
    const detail = { dataTransfer: ev.detail, index };
    dispatch('insert', detail);
    ev.preventDefault();
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

</script>

<div class="tail">
  <div class="tail-inner">
    <FileManagerInsertZone on:drop={onDrop} bind:acceptable={acceptable} depth={path.length}/>
  </div>
</div>

<style>
  .tail {
    position: relative;
    height: 0px;
  }
  .tail-inner {
    position: absolute;
    width: 100%;
    height: 20px;
  }
</style>
