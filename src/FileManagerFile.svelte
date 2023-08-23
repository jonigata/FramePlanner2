<script lang="ts">
  import { loadPageFrom, fileManagerDragging } from "./fileManagerStore";
  import type { BindId, FileSystem, Folder, File } from "./lib/filesystem/fileSystem";
  import { mainPage } from './pageStore';
  import { createEventDispatcher, onMount } from 'svelte'
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";
  import trashIcon from './assets/fileManager/trash.png';

  const dispatch = createEventDispatcher();

  export let fileSystem: FileSystem;
  export let name: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
  export let index: number;
  export let path;

  let isDraggingOver = false;
  let acceptable = false;
  let isDiscardable = false;

  $: ondrag($fileManagerDragging);
  function ondrag(dragging) {
    if (dragging) {
      console.log("file ondrag", path, dragging.bindId);
    }
    acceptable = dragging && !path.includes(dragging.bindId);
  }

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
      $fileManagerDragging = { bindId, parent: parent.id };
    }, 0);
	}

  function onDragEnd(ev) {
    console.log("file dragend")
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

  function removeFile() {

  }

  function onDrop(ev) {
    isDraggingOver = false;
    const detail = { dataTransfer: ev.detail, index };
    dispatch('insert', detail);
    ev.preventDefault();
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

  onMount(async () => {
    const root = await fileSystem.getRoot();
    const trash = await root.getEntryByName("ごみ箱");
    isDiscardable = removability === "removable" && !path.includes(trash[0]);
  });
  
</script>

<div class="file-title" draggable={true} on:dblclick={onDoubleClick} on:dragstart={onDragStart} on:dragend={onDragEnd}>
  {name}
  {#if isDiscardable}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <img class="button" src={trashIcon} alt="trash" on:click={removeFile} />
  {/if}
<FileManagerInsertZone on:drop={onDrop} bind:acceptable={acceptable} depth={path.length}/>
</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
    user-select: none;
    position: relative;
  }
  .button {
    width: 20px;
    height: 20px;
    display: inline;
  }
</style>
