<script lang="ts">
  import { loadPageFrom, fileManagerDragging } from "./fileManagerStore";
  import type { BindId, FileSystem, Folder, File } from "./lib/filesystem/fileSystem";
  import { mainPage } from './pageStore';
  import { createEventDispatcher, tick } from 'svelte'

  const dispatch = createEventDispatcher()

  export let fileSystem: FileSystem;
  export let name: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
  export let index: number;

  let isDraggingOver = false;

  async function onDoubleClick() {
    const file = await parent.getNode(bindId) as File;
    const page = await loadPageFrom(fileSystem, file);
    $mainPage = page;
  }

	async function onDragStart (ev) {
    console.log("file dragstart");
		ev.dataTransfer.setData("bindId", bindId);
		ev.dataTransfer.setData("parent", parent.id);
    ev.stopPropagation();
    setTimeout(() => {
      // こうしないとなぜかdragendが即時発火してしまう
      $fileManagerDragging = true;
    }, 0);
	}

  function onDragEnd(ev) {
    console.log("file dragend")
    ev.stopPropagation();
    $fileManagerDragging = false;
  }

  function onDragOver(event) {
    event.preventDefault();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  function onDrop(ev) {
    ev.preventDefault();
    isDraggingOver = false;
    const detail = { dataTransfer: ev.dataTransfer, index };
    dispatch('insert', detail);
    ev.stopPropagation();
    $fileManagerDragging = false;
  }
  
</script>

<div class="file-title" draggable={true} on:dblclick={onDoubleClick} on:dragstart={onDragStart} on:dragend={onDragEnd}>
  {name}
  <div 
    class="drop-zone"
    class:dragging={$fileManagerDragging}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
  >
    <div
      class="insert-line"
      class:dragging={isDraggingOver}
    >

    </div>
  </div>
</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
    user-select: none;
    position: relative;
  }

  .drop-zone {
    background-color: #eee;
    border: 1px dashed #ccc;
    position: absolute;
    top: -50%; /* 親の高さの半分だけ上に移動 */
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
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
