<script lang="ts">
  import type { FileSystem, Folder, NodeId, BindId, Node } from "../lib/filesystem/fileSystem";
  import FileManagerFile from "./FileManagerFile.svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  import { trashUpdateToken, fileManagerRefreshKey, fileManagerDragging, newFile, type Dragging, getCurrentDateTime, fileManagerUsedSize } from "./fileManagerStore";
  import { newBook } from "../bookeditor/book";
  import FileManagerFolderTail from "./FileManagerFolderTail.svelte";
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";
  import RenameEdit from "../utils/RenameEdit.svelte";
  import { toolTip } from '../utils/passiveToolTipStore';
  import { modalStore } from '@skeletonlabs/skeleton';

  import newFileIcon from '../assets/fileManager/new-file.png';
  import newFolderIcon from '../assets/fileManager/new-folder.png';
  import trashIcon from '../assets/fileManager/trash.png';
  import folderIcon from '../assets/fileManager/folder.png';
  import renameIcon from '../assets/fileManager/rename.png';
  import { collectGarbage, purgeCollectedGarbage } from "../utils/garbageCollection";

  export let fileSystem: FileSystem;
  export let filename: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let isTrash = false;
  export let removability: "removable" | "unremovable" = "removable";
  export let spawnability: "file-spawnable" | "folder-spawnable" | "unspawnable" = "unspawnable";
  export let index: number;
  export let path: string[];

  let node: Folder;
  let acceptable: boolean;
  let isDraggingOver: boolean;
  let isDiscardable = false;
  let renameEdit = null;
  let renaming = false;

  const dispatch = createEventDispatcher();

  $: ondrag($fileManagerDragging);
  function ondrag(dragging: Dragging) {
    acceptable = dragging && !path.includes(dragging.bindId);
  }

  async function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  async function onDropHere(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (acceptable) {
      console.log(ev);
      await moveToHere(ev.dataTransfer, 0);
    } else {
      console.log("not acceptable");
    }
  }

  async function addFolder() {
    console.log("add folder");
    const nf = await fileSystem.createFolder();
    await node.link("new folder", nf.id);
    node = node;
  }

  async function addFile() {
    console.log("add file");
    const book = newBook("not visited", "add-in-folder-", 0);
    await newFile(fileSystem, node, getCurrentDateTime(), book);
    node = node;
  }

  async function removeFolder() {
    dispatch('remove', bindId);
  }

  async function removeChild(e: CustomEvent<BindId>) {
    console.log("remove child", e.detail);
    const childBindId = e.detail as BindId;
    const childEntry = await node.getEntry(childBindId);
    if (!isTrash) {
      const trash = (await (await fileSystem.getRoot()).getNodeByName("ごみ箱")).asFolder();
      await trash.link(childEntry[1], childEntry[2]);
      $trashUpdateToken = true;
    }
    await node.unlink(childBindId);
    node = node;
  }

  $:onUpdate(isTrash && $trashUpdateToken);
  function onUpdate(token: boolean) {
    if (token) {
      $trashUpdateToken = false;
      node = node;
    }
  }

  function onInsertToParent(ev: CustomEvent<DataTransfer>) {
    console.log("insert to parent", ev.detail);
    isDraggingOver = false;
    const detail = { dataTransfer: ev.detail, index };
    dispatch('insert', detail);
    ev.preventDefault();
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

  let entry: [BindId, string, Node];
  onMount(async () => {
    entry = await parent.getEmbodiedEntry(bindId)
    node = entry[2] as Folder;

    const root = await fileSystem.getRoot();
    const trash = await root.getEntryByName("ごみ箱");
    isDiscardable = removability === "removable" && !path.includes(trash[0]);
  });

  function onDragStart(ev: DragEvent) {
    console.log("folder drag start", bindId, parent.id, renaming);
    if (renaming || removability === "unremovable") {
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

  async function onInsert(e: CustomEvent<{ dataTransfer: DataTransfer, index: number }>) {
    console.log("insert", e.detail);
    await moveToHere(e.detail.dataTransfer, e.detail.index);
  }

  async function moveToHere(dataTransfer: DataTransfer, index: number) {
    console.log("++++++++++++ moveToHere", dataTransfer, index);

    const sourceParentId = dataTransfer.getData("parent") as string as NodeId;
    const bindId = dataTransfer.getData("bindId") as string as BindId;

    const sourceParent = (await fileSystem.getNode(sourceParentId)) as Folder;
    const mover = await sourceParent.getEntry(bindId);

    if (index === null) {
      index = (await node.list()).length;      
    }

    console.log("insert", sourceParentId, bindId, node.id, "index=", index);

    await sourceParent.unlink(bindId);
    await node.insert(mover[1], mover[2], index);
    $fileManagerRefreshKey++;
    console.log("insert done");
  }

  async function recycle() {
    await recycleNode(node);
    modalStore.trigger({ type: 'component',component: 'waiting' });    
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
    console.log("usedImageFiles", usedImageFiles);
    console.log("strayImageFiles", strayImageFiles);
    const imageFolder = (await (await fileSystem.getRoot()).getNodeByName("画像")).asFolder();
    await purgeCollectedGarbage(fileSystem, imageFolder, strayImageFiles);
    modalStore.close();
    $fileManagerUsedSize = await fileSystem.collectTotalSize();
    $fileManagerRefreshKey++;
    node = node;
  }

  async function recycleNode(curr: Node) {
    if (curr.getType() === "folder") {
      const folder = curr.asFolder();
      const entries = await folder.listEmbodied();
      for (const entry of entries) {
        if (curr.id === node.id) { // node以外はどうせ親を消すのでunlink不要
          await folder.unlink(entry[0]);
        }
        await recycleNode(entry[2]);
      }
    }
    if (curr.id !== node.id) {
      await fileSystem.destroyNode(curr.id);
    }
  }

  async function renameChild(e: CustomEvent<{ bindId: BindId, name: string }>) {
    console.log("rename child", e.detail);
    const { bindId, name } = e.detail;
    await node.rename(bindId, name);
    node = node;
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

</script>

{#if node}
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="folder"
  on:dragover={onDragOver} 
  on:dragstart={onDragStart}
  on:dragleave={onDragLeave}
  on:drop={onDropHere}
>
  <div
    class="folder-title-line" 
    class:no-select={removability === "unremovable"}
    draggable={removability === "removable"}
  >
    <div class="folder-title">
      <div class="foldername" use:toolTip={"ドラッグで移動"}>
        <img class="button" src={folderIcon} alt="symbol"/>
        <RenameEdit bind:this={renameEdit} bind:editing={renaming} value={filename} on:submit={submitRename}/>
      </div>
      {#if isTrash}
        <button class="btn btn-sm variant-filled recycle-button" on:click={recycle}>空にする</button>
      {/if}
      <div class="button-container">
        {#if spawnability === "file-spawnable"}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={newFileIcon} alt="new file" on:click={addFile} use:toolTip={"ページ作成"}/>
        {/if}
        {#if spawnability === "folder-spawnable"}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={newFolderIcon} alt="new folder" on:click={addFolder} use:toolTip={"フォルダ作成"}/>
        {/if}
      </div> 
  </div>
    <div class="buttons hbox gap-2">
      <div class="button-container">
        {#if isDiscardable}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={renameIcon} alt="rename" on:click={startRename} use:toolTip={"フォルダ名変更"}/>
        {/if}
      </div>  
      <div class="button-container">
        {#if isDiscardable}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="button" src={trashIcon} alt="trash" on:click={removeFolder} use:toolTip={"捨てる"}/>
        {/if}
      </div>
    </div>
    {#if removability === 'removable'}
      <FileManagerInsertZone on:drop={onInsertToParent} bind:acceptable={acceptable} depth={path.length}/>
    {/if}
  </div>
  <div class="folder-contents"
    class:acceptable={isDraggingOver && acceptable}
  >
    {#await node.listEmbodied()}
      <div>loading...</div>
    {:then children}
      {#each children as [bindId, filename, childNode], index}
        {#if childNode.getType() === 'folder'}
          <svelte:self fileSystem={fileSystem} removability={"removable"} spawnability={spawnability} filename={filename} bindId={bindId} parent={node} index={index} on:insert={onInsert} on:remove={removeChild} path={[...path, bindId]} on:rename={renameChild}/>
        {:else if childNode.getType() === 'file'}
          <FileManagerFile fileSystem={fileSystem} removability={"removable"} nodeId={childNode.id} filename={filename} bindId={bindId} parent={node} index={index} on:insert={onInsert} path={[...path, bindId]} on:remove={removeChild} on:rename={renameChild}/>
        {/if}
      {/each}
      <FileManagerFolderTail index={children.length} on:insert={onInsert} path={[...path, 'tail']}/>
    {:catch error}
      <div>error: {error.message}</div>
    {/await}
  </div>
</div>
{/if}

<style>
  .folder {
    text-align: left;
  }
  .folder-title-line {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 24px;
    position: relative; /* InsertZone用 */
  }
  .folder-title-line:hover {
    background-color: #fff4;
  }
  .folder-title {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-family: 'Zen Maru Gothic';
    font-weight: 700;
    font-style: normal;
    width: 100%;
    height: 20px;
    margin-left: 4px;
  }
  .foldername {
    background: rgb(221, 235, 189);
    border-radius: 8px;
    padding-left: 4px;
    padding-right: 4px;
    padding-top: 2px;
    padding-bottom: 2px;
    display: flex;
    flex-direction: row;
    margin-right: 8px;
  }
  .folder-contents {
    padding-left: 16px;
    box-sizing: border-box;
    /* border: 2px dashed transparent; /* 初期状態では透明にしておく */
  }
  .folder-contents.acceptable {
    background-color: #ee84;
    /* border: 2px dashed #444; */
    box-shadow: 0 0 0 2px #444 inset; /* inset を使用して要素の内側に影を追加 */
  }
  .buttons {
    gap: 0px;
  }
  .button-container {
    width: 20px;
    height: 16px;
    display: flex;
  }
  .button {
    width: 16px;
    height: 16px;
    display: inline;
  }
  .recycle-button {
    height: 20px;
    font-size: 12px;
  }
  .no-select {
    user-select: none; /* 標準のCSS */
    -webkit-user-select: none; /* Chrome, Safari */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE/Edge */
  }
</style>
