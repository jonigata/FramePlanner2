<script lang="ts">
  import type { FileSystem, File, Folder, NodeId, BindId } from "./lib/filesystem/fileSystem";
  import FileManagerFile from "./FileManagerFile.svelte";
  import { createEventDispatcher, onMount } from 'svelte';
  import { trashUpdateToken, fileManagerRefreshKey, fileManagerDragging } from "./fileManagerStore";
  import FileManagerFolderTail from "./FileManagerFolderTail.svelte";

  export let fileSystem: FileSystem;
  export let name: string;
  export let bindId: BindId;
  export let parent: Folder;
  export let isTrash = false;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
  export let spawnability = "spawnable"; // "spawnable" | "unspawnable"
  export let path;

  let node;

  const dispatch = createEventDispatcher();

  async function addFolder() {
    // console.log(fileSystem);
    const nf = await fileSystem.createFolder();
    await node.link("new folder", nf);
    node = node;
  }

  async function removeFolder() {
    dispatch('remove', name);
  }

  async function removeChild(e) {
    const childName = e.detail;
    const childNode = await node.find(e.detail);
    if (!isTrash) {
      const trash = (await (await fileSystem.getRoot()).find("ごみ箱")).asFolder();
      await trash.link(childName, childNode);
      $trashUpdateToken = true;
    }
    await node.unlink(childName);
    node = node;
  }

  $:onUpdate(isTrash && $trashUpdateToken);
  function onUpdate(token) {
    if (token) {
      $trashUpdateToken = false;
      node = node;
    }
  }

  function getChildRemovability() {
    if (removability === "unremovable-deep") {
      return "unremovable-deep";
    }
    return "removable";
  }

	export function onDragOver (ev) {
		ev.preventDefault();
	}

  async function onDrop(e) {
    await moveToHere(e.dataTransfer, 0);
    $fileManagerDragging = null;
  }

  let entry;
  onMount(async () => {
    entry = await parent.getEntry(bindId)
    node = await parent.getNode(bindId) as Folder;
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
    await moveToHere(e.detail.dataTransfer, e.detail.index);
  }

  async function moveToHere(dataTransfer, index) {
    console.log("++++++++++++ moveToHere", dataTransfer, index);

    const sourceParentId = dataTransfer.getData("parent") as string as NodeId;
    const bindId = dataTransfer.getData("bindId") as string as BindId;

    console.log("insert", sourceParentId, bindId, node.id, "index=", index);

    const sourceParent = (await fileSystem.getNode(sourceParentId)) as Folder;
    const mover = await sourceParent.getEntry(bindId);

    await sourceParent.unlink(bindId);
    await node.insert(mover[1], mover[2], index);
    $fileManagerRefreshKey++;
    console.log("insert done");
  }
</script>

{#if node}
<div class="folder" on:dragover={onDragOver} on:drop={onDrop} on:dragstart={onDragStart}>
  <div class="folder-title" draggable={removability === "removable"}>
    {name}/{bindId}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    {#if spawnability === "spawnable"}
      <div class="btn variant-filled add-folder-button" on:click={addFolder}>+</div>
    {/if}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    {#if removability === "removable"}
      <div class="btn variant-filled remove-folder-button" on:click={removeFolder}>-</div>
    {/if}
  </div>
  <div class="folder-contents">
    {#await node.list()}
      <div>loading...</div>
    {:then children}
      {#each children as [bindId, name, childNode], index}
        {#if childNode.getType() === 'folder'}
          <svelte:self fileSystem={fileSystem} removability={getChildRemovability()} spawnability={spawnability} name={name} bindId={bindId} parent={node} on:remove={removeChild} path={[...path, bindId]}/>
        {:else if childNode.getType() === 'file'}
          <FileManagerFile fileSystem={fileSystem} removability={getChildRemovability()} name={name} bindId={bindId} parent={node} index={index} on:insert={onInsert} path={[...path, bindId]}/>
        {/if}
      {/each}
      <FileManagerFolderTail index={children.length} on:insert={onInsert} path={[...path, bindId]}/>
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
  }
  .folder-contents {
    padding-left: 16px;
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
</style>
