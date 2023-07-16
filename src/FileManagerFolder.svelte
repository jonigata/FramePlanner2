<script lang="ts">
  import type { FileSystem, Folder } from "./lib/filesystem/fileSystem";
  import FileManagerFile from "./FileManagerFile.svelte";
  import { createEventDispatcher } from 'svelte';
  import { trashUpdateToken } from "./fileManagerStore";

  export let fileSystem: FileSystem;
  export let name: string;
  export let node: Folder;
  export let isTrash = false;
  export let removability = "removeable"; // "removable" | "unremovable-shallow" | "unremovable-deep"
  export let spawnability = "spawnable"; // "spawnable" | "unspawnable"

  const dispatch = createEventDispatcher();

  async function addFolder() {
    console.log(fileSystem);
    const nf = await fileSystem.createFolder();
    await node.link("new folder", nf);
    node = node;
  }

  async function removeFolder() {
    dispatch('remove', name);
  }

  async function removeChild(e) {
    const childName = e.detail;
    const childNode = await node.get(e.detail);
    if (!isTrash) {
      const trash = (await (await fileSystem.getRoot()).get("ごみ箱")).asFolder();
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
</script>

{#if node != null}
<div class="folder">
  <div class="folder-title">
    {name}
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
      {#each children as [name, node]}
        {#if node.getType() === 'folder'}
          <svelte:self fileSystem={fileSystem} removability={getChildRemovability()} spawnability={spawnability} name={name} node={node.asFolder()} on:remove={removeChild}/>
        {:else if node.getType() === 'file'}
          <FileManagerFile removability={getChildRemovability()} name={name} node={node.asFile()}/>
        {/if}
      {/each}
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
