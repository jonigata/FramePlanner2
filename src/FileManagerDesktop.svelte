<script lang="ts">
  import FileManagerDesktopPaper from './FileManagerDesktopPaper.svelte';
  import type { FileSystem, Folder } from "./lib/filesystem/fileSystem";
  import { FrameElement } from './lib/layeredCanvas/frameTree.js';
  import type { Page } from './pageStore';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import { savePageTo } from "./fileManagerStore";

  export let fileSystem: FileSystem;
  export let node: Folder;

  async function createNewFile() {
    const page: Page = {
      frameTree: FrameElement.compile(frameExamples[2]),
      bubbles:[], 
      revision: { id:'dummy', revision:1, prefix: 'dummy' }, 
      paperSize: [840, 1188],
      paperColor: '#ffffff',
      frameColor: '#000000',
      frameWidth: 2,
      desktopPosition: [0, 0],
      history: [],
      historyIndex: 0,
    }

    const file = await fileSystem.createFile();
    console.log("*********** savePageTo from createNewFile");
    await savePageTo(page, fileSystem, file);
    await node.link("new file", file);
    node = node;
  }

</script>

<div class="desktop">
  {#if node != null}
    {#await node.list()}
      <div>loading...</div>
    {:then children}
      {#each children as [_bindId, _name, node]}
        <FileManagerDesktopPaper fileSystem={fileSystem} node={node.asFile()}/>
      {/each}
    {:catch error}
      <div>error: {error.message}</div>
    {/await}
  {/if}
  <button class="btn btn-sm variant-filled add-document-button" on:click={createNewFile} >+</button>
</div>

<style>
  .desktop {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .add-document-button {
    position: absolute;
    right: 16px;
    bottom: 16px;
  }
</style>
