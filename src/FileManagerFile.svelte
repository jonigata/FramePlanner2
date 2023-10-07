<script lang="ts">
  import { loadPageFrom, fileManagerDragging, type Dragging } from "./fileManagerStore";
  import type { NodeId, BindId, FileSystem, Folder, File } from "./lib/filesystem/fileSystem";
  import { type Page, mainPage } from './pageStore';
  import { createEventDispatcher, onMount } from 'svelte'
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";
  import RenameEdit from "./RenameEdit.svelte";

  import trashIcon from './assets/fileManager/trash.png';
  import renameIcon from './assets/fileManager/rename.png';
  import fileIcon from './assets/fileManager/file.png';

  const dispatch = createEventDispatcher();

  export let fileSystem: FileSystem;
  export let nodeId: NodeId;
  export let bindId: BindId;
  export let filename: string;
  export let parent: Folder;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
  export let index: number;
  export let path: string[];
  export let displayMode: 'filename' | 'index' = 'filename';

  let acceptable = false;
  let isDiscardable = false;
  let selected = false;
  let renameEdit = null;
  let renaming = false;

  $: onSelectionChanged($mainPage);
  function onSelectionChanged(page: Page) {
    selected = page.revision.id === nodeId;
  }

  $: ondrag($fileManagerDragging);
  function ondrag(dragging: Dragging) {
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

	async function onDragStart (ev: DragEvent) {
    console.log("file dragstart", renaming);
    if (renaming) {
      ev.preventDefault();
      return;
    }
		ev.dataTransfer.setData("bindId", bindId);
		ev.dataTransfer.setData("parent", parent.id);
    ev.stopPropagation();
    setTimeout(() => {
      // こうしないとなぜかdragendが即時発火してしまう
      $fileManagerDragging = { bindId, parent: parent.id };
    }, 0);
	}

  function onDragEnd(ev: DragEvent) {
    console.log("file dragend")
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

  function removeFile() {
    dispatch('remove', bindId);
  }

  function startRename() {
    console.log("renameFile");
    renameEdit.setFocus();
  }

  function submitRename(e: CustomEvent<string>) {
    console.log("submitRename", e.detail);
    dispatch('rename', { bindId, name: e.detail });
    renaming = false;
  }

  function onDrop(ev: CustomEvent<DataTransfer>) {
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

<div class="file-title" class:selected={selected}
  draggable={true} on:dblclick={onDoubleClick} on:dragstart={onDragStart} on:dragend={onDragEnd}>
  <img class="button" src={fileIcon} alt="symbol"/>
  {#if isDiscardable}
    {#if displayMode === 'index'}
      {`Page ${( '00' + (index+1) ).slice( -2 )}`}
    {:else}
      <RenameEdit bind:this={renameEdit} bind:editing={renaming} value={filename} on:submit={submitRename}/>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="button-container">
        <img class="button" src={renameIcon} alt="rename" on:click={startRename}/>
      </div>  
    {/if}
    <div class="button-container">
      {#if !selected}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <img class="button" src={trashIcon} alt="trash" on:click={removeFile} />
      {/if}
    </div>
  {:else}
    {filename}
  {/if}
  <FileManagerInsertZone on:drop={onDrop} bind:acceptable={acceptable} depth={path.length}/>
</div>

<style>
  .file-title {
    font-size: 16px;
    font-weight: 700;
    user-select: none;
    position: relative;
    display: flex;
    flex-direction: row;
    height: 18px;
  }
  .button-container {
    width: 20px;
    min-width: 20px;
    height: 16px;
    display: flex;
  }
  .button {
    width: 16px;
    height: 16px;
    display: inline;
  }
  .selected {
    background-color: #ccc;
  }
</style>
