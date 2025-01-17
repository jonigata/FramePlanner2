<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import GalleryImage from "./GalleryImage.svelte";

  export let canvases: HTMLCanvasElement[];
  export let columnWidth = 220;
  export let accessable = true;

  export let chosen: HTMLCanvasElement | null = null;
  export let refered: HTMLCanvasElement | null = null;

  const dispatch = createEventDispatcher();

  function onCommit(e: CustomEvent<HTMLCanvasElement>) {
    dispatch("commit", e.detail);
  }

  async function onDelete(e: CustomEvent<HTMLCanvasElement>) {
    canvases = canvases.filter(c => c !== e.detail);
    dispatch("delete", e.detail);
  }

  function onDragStart(e: CustomEvent<HTMLImageElement>) {
    dispatch("dragstart", e.detail);
  }
</script>

<div class="gallery">
  {#each canvases as canvas}
    <GalleryImage bind:chosen={chosen} bind:refered={refered} width={columnWidth} canvas={canvas} accessable={accessable} on:commit={onCommit} on:delete={onDelete} on:dragstart={onDragStart}/>
  {/each}
</div>

<style>
  .gallery {
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
  }
</style>