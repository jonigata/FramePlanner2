<script lang="ts">
  import { onMount } from "svelte";
  import { loadPageFrom } from "./fileManagerStore";
  import type { FileSystem, File } from "./lib/filesystem/fileSystem";
  import { draggable } from '@neodrag/svelte';
  import { mainPage } from './pageStore';
  import Paper from './Paper.svelte';

  export let fileSystem: FileSystem;
  export let node: File;
  export let position = { x: 0, y: 0 };

  let page;

  function onDoubleClick() {
    $mainPage = page;
  }

  function makePage(p) {
    console.log(p);
    page = {
      ...p,
      paperSize: [Math.ceil(p.paperSize[0] / 10), Math.ceil(p.paperSize[1] / 10)],
    };
    return page;
  }
</script>

<div class="desktop-paper" 
  use:draggable={{
    position: position,
    onDragEnd: ({ offsetX, offsetY, rootNode, currentNode }) => {
      console.log(offsetX, offsetY);
      page.desktopPosition = [offsetX, offsetY];
      position = { x: offsetX, y: offsetY };
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
  }
</style>
