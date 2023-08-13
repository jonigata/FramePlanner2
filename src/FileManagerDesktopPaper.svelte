<script lang="ts">
  import { onMount } from "svelte";
  import { loadPageFrom } from "./fileManagerStore";
  import type { FileSystem, File } from "./lib/filesystem/fileSystem";
  import { draggable } from '@neodrag/svelte';
  import { mainPage } from './pageStore';
  import Paper from './Paper.svelte';
  import { savePageTo } from "./fileManagerStore";

  export let fileSystem: FileSystem;
  export let node: File;
  export let position = { x: 0, y: 0 };

  let page;

  async function onDoubleClick() {
    const file = (await fileSystem.getNode(page.revision.id)).asFile();
    const filePage = await loadPageFrom(fileSystem, file);
    $mainPage = filePage;
  }

  function makePage(p) {
    console.log(p);
    page = {
      ...p,
      paperSize: [Math.ceil(p.paperSize[0] / 10), Math.ceil(p.paperSize[1] / 10)],
    };
    const desktopPosition = p.desktopPosition;
    if (desktopPosition) {
      position = { x: desktopPosition[0], y: desktopPosition[1] };
    }
    return page;
  }
</script>

<div class="desktop-paper" 
  use:draggable={{
    position: position,
    onDragEnd: async ({ offsetX, offsetY, rootNode, currentNode }) => {
      console.log(page);
      position = { x: offsetX, y: offsetY };
      const file = (await fileSystem.getNode(page.revision.id)).asFile();
      const filePage = await loadPageFrom(fileSystem, file);
      filePage.desktopPosition = [offsetX, offsetY];
      await savePageTo(filePage, fileSystem, file);
    },
  }}
  on:dblclick={onDoubleClick}>
  {#await loadPageFrom(fileSystem, node)}
    <div>loading...</div> 
  {:then p}
    <Paper page={makePage(p)}/>
  {/await}
</div>

<style>
  .desktop-paper {
    position: absolute;
    left: 50%;
    top: 50%;
		box-shadow: 0 0.25rem 1rem 0 rgba(0,0,0,0.5);
  }
</style>
