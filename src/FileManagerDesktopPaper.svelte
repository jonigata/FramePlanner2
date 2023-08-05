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

  let page = null;

  function onDoubleClick(page) {
    $mainPage = page;
  }

  onMount(async () => {
    const p = await loadPageFrom(fileSystem, node);
    page = {
      ...p,
      paperSize: [Math.ceil(p.paperSize[0] / 10), Math.ceil(p.paperSize[1] / 10)],
    };
  });
</script>

<div class="desktop-paper" use:draggable={{ position: position }} on:dblclick={() => onDoubleClick(page)}>
  {#await page}
  <div>loading...</div>
  {:then p}
  <Paper page={p}/>
  {/await}
</div>

<style>
  .desktop-paper {
    position: absolute;
    left: 50%;
    top: 50%;
  }
</style>
