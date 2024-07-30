<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import GalleryImage from "./GalleryImage.svelte";

  export let canvases: HTMLCanvasElement[] = [];
  export let columnWidth = 220;

  export let chosen = null;
  export let refered = null;

  const dispatch = createEventDispatcher();

  function onCommit(e: CustomEvent<HTMLCanvasElement>) {
    dispatch("commit", e.detail);
  }

  async function onDelete(e: CustomEvent<HTMLCanvasElement>) {
    console.log(canvases.indexOf(e.detail));
    canvases.splice(canvases.indexOf(e.detail), 1);
    const newImages = canvases;
    canvases = [];
    await tick();
    canvases = newImages;
    dispatch("delete", e.detail);
  }

  function onRefer(e: CustomEvent<HTMLImageElement>) {
    refered = e.detail;
  }

  function onDragStart(e: CustomEvent<HTMLImageElement>) {
    dispatch("dragstart", e.detail);
  }
</script>

<div>
  {#each canvases as canvas}
    <GalleryImage bind:chosen={chosen} bind:refered={refered} width={columnWidth} canvas={canvas} on:commit={onCommit} on:delete={onDelete} on:refer={onRefer} on:dragstart={onDragStart}/>
  {/each}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
  }
</style>