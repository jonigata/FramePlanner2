<script lang="ts">
  import { fileManagerDragging, fileManagerMarkedFlag, loadBookFrom, loadToken, saveBookTo, selectedFile, type Dragging } from "./fileManagerStore";
  import type { NodeId, BindId, FileSystem, Folder } from "../lib/filesystem/fileSystem";
  import { mainBook, bookOperators } from '../bookeditor/workspaceStore';
  import { createEventDispatcher, onMount } from 'svelte'
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";
  import RenameEdit from "../utils/RenameEdit.svelte";
  import { toolTip } from '../utils/passiveToolTipStore';
  import { saveAs } from 'file-saver';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { writeEnvelope } from "../lib/book/envelope";
  import { progress } from '../utils/loadingStore';

  import trashIcon from '../assets/fileManager/trash.webp';
  import renameIcon from '../assets/fileManager/rename.webp';
  import fileIcon from '../assets/fileManager/file.webp';
  import pasteIcon from '../assets/fileManager/paste.webp'
  import packageIcon from '../assets/fileManager/package-export.webp'

  const dispatch = createEventDispatcher();

  export let fileSystem: FileSystem;
  export let nodeId: NodeId;
  export let bindId: BindId;
  export let filename: string;
  export let parent: Folder;
  export let trash: Folder | null; // 捨てるときの対象、ごみ箱の中身の場合はnull
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
  export let index: number;
  export let path: string[];

  let acceptable = false;
  let isDiscardable = false;
  let loaded = false;
  let renameEdit: RenameEdit | null = null;
  let renaming = false;

  $: if ($mainBook) {
    loaded = $mainBook.revision.id === nodeId;
  }

  $: ondrag($fileManagerDragging);
  function ondrag(dragging: Dragging | null) {
    acceptable = dragging != null && !path.includes(dragging.bindId);
  }

	async function onDragStart (ev: DragEvent) {
    console.log("file dragstart", renaming);
    if (renaming) {
      ev.preventDefault();
      return;
    }
		ev.dataTransfer!.setData("bindId", bindId);
		ev.dataTransfer!.setData("parent", parent.id);
    ev.stopPropagation();
    setTimeout(() => {
      // こうしないとなぜかdragendが即時発火してしまう
      $fileManagerDragging = { fileSystem, bindId, parent: parent.id };
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
    renameEdit!.setFocus();
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

  async function onClick(e: MouseEvent) {
    if ($selectedFile === nodeId) {
      if (fileSystem.isVault) {
        toastStore.trigger({ message: `クラウドファイルを直接開くことはできません<br/>ローカルにコピーしてから開いてください`, timeout: 3000});
        return;
      }
      $loadToken = { fileSystem, nodeId, parent, bindId };
    } else {
      $selectedFile = nodeId;
    }
  }

  async function copyMarkedPages() {
    const marked = $bookOperators!.getMarks();
    const pages = $mainBook!.pages;
    const markedPages = pages.filter((_, i) => marked[i]);

    const file = (await fileSystem.getNode(nodeId))!.asFile()!;
    const targetBook = await loadBookFrom(fileSystem, file);
    targetBook.pages.push(...markedPages);
    await saveBookTo(targetBook, fileSystem, file);
    toastStore.trigger({ message: 'マークされたページを<br/>コピーしました', timeout: 1500});
  }

  async function makePackage() {
    $progress = 0;
    const file = (await fileSystem.getNode(nodeId))!.asFile()!;
    const book = await loadBookFrom(fileSystem, file);
    const blob = await writeEnvelope(book, n => $progress = n);
    saveAs(blob, `${filename}.envelope`);
    $progress = null;
  }

  onMount(async () => {
    isDiscardable = removability === "removable" && trash != null;
  });
  
</script>

<div class="file" class:selected={nodeId === $selectedFile}>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="file-title" class:loaded={loaded} use:toolTip={"ドラッグで移動、ダブルクリックで編集"}
    draggable={true} on:click={onClick} on:dragstart={onDragStart} on:dragend={onDragEnd}>
    <img class="button" src={fileIcon} alt="symbol"/>
    {#if isDiscardable}
      <div class="filename">
        <RenameEdit bind:this={renameEdit} bind:editing={renaming} value={filename} on:submit={submitRename}/>
      </div>
    {:else}
      {filename}
    {/if}
  </div>
  {#if $fileManagerMarkedFlag}
    <div class="button-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="button" src={pasteIcon} alt="rename" on:click={copyMarkedPages} use:toolTip={"選択ページを\nこのファイルにコピー"}/>
    </div>  
  {/if}
  <div class="button-container">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img class="button" src={packageIcon} alt="rename" on:click={makePackage} use:toolTip={"パッケージ作成"}/>
  </div>  
  <div class="button-container">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img class="button" src={renameIcon} alt="rename" on:click={startRename} use:toolTip={"ページ名変更"}/>
  </div>  
  <div class="button-container">
    {#if isDiscardable}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="button" src={trashIcon} alt="trash" on:click={removeFile} use:toolTip={"捨てる"}/>
    {/if}
  </div>
  <FileManagerInsertZone on:drop={onDrop} bind:acceptable={acceptable} depth={path.length}/>
</div>

<style>
  .file {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    position: relative;
    border: 2px solid transparent;
  }
  .file:hover {
    background-color: #fff4;
  }
  .file-title {
    font-size: 16px;
    font-weight: 700;
    user-select: none;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 24px;
  }
  .button-container {
    width: 20px;
    min-width: 20px;
    height: 16px;
    display: flex;
    gap: 4px;
  }
  .button {
    width: 16px;
    height: 16px;
    display: inline;
  }
  .loaded {
    background-color: #f8f4;
    border-radius: 8px;
  }
  .selected {
    border-color: #4a90e2;
  }

</style>
