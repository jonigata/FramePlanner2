<script lang="ts">
  import FileManagerDesktopPaper from './FileManagerDesktopPaper.svelte';
  import type { FileSystem, Folder } from "./lib/filesystem/fileSystem";

  export let fileSystem: FileSystem;
  export let node: Folder;

</script>

<div class="desktop">
  {#if node != null}
    {#await node.list()}
      <div>loading...</div>
    {:then children}
      {#each children as [name, node]}
        <FileManagerDesktopPaper fileSystem={fileSystem} node={node.asFile()}/>
      {/each}
    {:catch error}
      <div>error: {error.message}</div>
    {/await}
  {/if}
  <button class="btn btn-sm variant-filled add-document-button" >+</button>
</div>

<style>
  .desktop {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .desktop-paper {
    position: absolute;
    left: 50%;
    top: 50%;
  }
  .add-document-button {
    position: absolute;
    right: 16px;
    bottom: 16px;
  }
</style>
