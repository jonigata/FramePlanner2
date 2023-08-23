<script lang="ts">
  import type { FileSystem, File, Folder, NodeId, BindId } from "./lib/filesystem/fileSystem";
  import FileManagerFile from "./FileManagerFile.svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  import { trashUpdateToken, fileManagerRefreshKey, fileManagerDragging } from "./fileManagerStore";
  import FileManagerFolderTail from "./FileManagerFolderTail.svelte";
  import FileManagerInsertZone from "./FileManagerInsertZone.svelte";
  import newFileIcon from './assets/fileManager/new-file.png';
  import newFolderIcon from './assets/fileManager/new-folder.png';
  import trashIcon from './assets/fileManager/trash.png';

  export let fileSystem: FileSystem;
  export let name: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let isTrash = false;
  export let removability = "removeable"; // "removable" | "unremovable"
  export let spawnability = "spawnable"; // "spawnable" | "unspawnable"
  export let index: number;
  export let path;

  let node;
  let acceptable;
  let isDraggingOver;
  let isDiscardable = false;

  const dispatch = createEventDispatcher();

  $: ondrag($fileManagerDragging);
  function ondrag(dragging) {
    acceptable = dragging && !path.includes(dragging.bindId);
  }

  async function onDragOver(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  async function onDropHere(ev) {
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
    await node.link("new folder", nf);
    node = node;
  }

  async function addFile() {
    console.log("add file");
    const nf = await fileSystem.createFolder();
    await node.link("new folder", nf);
    node = node;
  }

  async function removeFolder() {
    dispatch('remove', bindId);
  }

  async function removeChild(e) {
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
  function onUpdate(token) {
    if (token) {
      $trashUpdateToken = false;
      node = node;
    }
  }

  function onInsertToParent(ev) {
    console.log("insert to parent", ev.detail);
    isDraggingOver = false;
    const detail = { dataTransfer: ev.detail, index };
    dispatch('insert', detail);
    ev.preventDefault();
    ev.stopPropagation();
    $fileManagerDragging = null;
  }

  let entry;
  onMount(async () => {
    entry = await parent.getEntry(bindId)
    node = entry[2] as Folder;

    const root = await fileSystem.getRoot();
    const trash = await root.getEntryByName("ごみ箱");
    isDiscardable = removability === "removable" && !path.includes(trash[0]);
    console.log(entry, path, trash[0]);
  });

  function onDragStart(ev) {
    console.log("folder drag start", bindId, parent.id);
    ev.dataTransfer.setData("bindId", bindId);
    ev.dataTransfer.setData("parent", parent.id);
    ev.stopPropagation();
    setTimeout(() => {
      // こうしないとなぜかdragendが即時発火してしまう
      $fileManagerDragging = { bindId, parent: parent.id };
    }, 0);
  }

  async function onInsert(e) {
    console.log("insert", e.detail);
    await moveToHere(e.detail.dataTransfer, e.detail.index);
  }

  async function moveToHere(dataTransfer, index) {
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
</script>

{#if node}
<div class="folder"
  on:dragover={onDragOver} 
  on:dragstart={onDragStart}
  on:dragleave={onDragLeave}
  on:drop={onDropHere}
>
  <div class="folder-title" draggable={removability === "removable"}>
    {name}/{bindId}
    <div class="buttons">
      {#if spawnability === "spawnable"}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <img class="button" src={newFileIcon} alt="new file" on:click={addFile}/>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <img class="button" src={newFolderIcon} alt="new folder" on:click={addFolder} />
      {/if}
      {#if isDiscardable}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <img class="button" src={trashIcon} alt="trash" on:click={removeFolder} />
      {/if}
    </div>
    <FileManagerInsertZone on:drop={onInsertToParent} bind:acceptable={acceptable} depth={path.length}/>
  </div>
  <div class="folder-contents"
    class:acceptable={isDraggingOver && acceptable}
  >
    {#await node.list()}
      <div>loading...</div>
    {:then children}
      {#each children as [bindId, name, childNode], index}
        {#if childNode.getType() === 'folder'}
          <svelte:self fileSystem={fileSystem} removability={"removable"} spawnability={spawnability} name={name} bindId={bindId} parent={node} index={index} on:insert={onInsert} on:remove={removeChild} path={[...path, bindId]}/>
        {:else if childNode.getType() === 'file'}
          <FileManagerFile fileSystem={fileSystem} removability={"removable"} name={name} bindId={bindId} parent={node} index={index} on:insert={onInsert} path={[...path, bindId]}/>
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
  .folder-title {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    flex-direction: row;
    align-items: center;
    position: relative;
  }
  .folder-contents {
    padding-left: 16px;
    box-sizing: border-box;
    border: 2px dashed transparent; /* 初期状態では透明にしておく */
  }
  .folder-contents.acceptable {
    background-color: #ee84;
    border: 2px dashed #444;
  }
  .add-folder-button {
    width: 12px;
    height: 12px;
    margin-left: 8px;
    padding: 10px;
    border-radius: 6px;
  }
  .remove-folder-button {
    width: 12px;
    height: 12px;
    margin-left: 8px;
    padding: 10px;
    border-radius: 6px;
  }
  .buttons {
    width: 80px;
    padding-left: 8px;
  }
  .button {
    width: 20px;
    height: 20px;
    display: inline;
  }
</style>
