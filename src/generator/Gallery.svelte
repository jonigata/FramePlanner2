<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import GalleryImage from "./GalleryImage.svelte";

  export let images: HTMLImageElement[] = [];
  export let columnWidth = 220;

  export let chosen = null;
  export let refered = null;

  const dispatch = createEventDispatcher();

  function onCommit(e: CustomEvent<HTMLImageElement>) {
    dispatch("commit", e.detail);
  }

  async function onDelete(e: CustomEvent<HTMLImageElement>) {
    console.log(images.indexOf(e.detail));
    images.splice(images.indexOf(e.detail), 1);
    const newImages = images;
    images = [];
    await tick();
    images = newImages;
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
  {#each images as image}
    <GalleryImage bind:chosen={chosen} bind:refered={refered} width={columnWidth} image={image} on:commit={onCommit} on:delete={onDelete} on:refer={onRefer} on:dragstart={onDragStart}/>
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