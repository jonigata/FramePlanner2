<script lang="ts">
  import type { Folder } from "./lib/filesystem/fileSystem";
  import FileManagerFile from "./FileManagerFile.svelte";
  import { createEventDispatcher } from 'svelte';

  export let node: Folder = null;
  export let trash: Folder = null;

  const dispatch = createEventDispatcher();

  async function addFolder() {
    await node.createFolder("new folder");
    node = node;
  }

  async function removeFolder() {
    dispatch('remove', node);
  }

  async function removeChild(e) {
    await node.copyChildTo(e.detail.name, trash);
    await node.deleteChild(e.detail.name);
    node = node;
  }
</script>

{#if node != null}
<div class="folder">
  <div class="folder-title">
    {node.name}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="btn variant-filled add-folder-button" on:click={addFolder}>+</div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="btn variant-filled remove-folder-button" on:click={removeFolder}>-</div>
  </div>
  <div class="folder-contents">
    {#await node.list()}
      <div>loading...</div>
    {:then children}
      {#each children as child}
        {#if child.getType() === 'folder'}
          <svelte:self node={child.asFolder()} on:remove={removeChild}/>
        {:else if child.getType() === 'file'}
          <FileManagerFile node={child.asFile()}/>
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
