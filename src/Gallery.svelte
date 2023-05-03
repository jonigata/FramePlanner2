<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import GalleryImage from "./GalleryImage.svelte";

  export let images: HTMLImageElement[] = [];
  export let columnWidth = 220;

  export let chosen = null;

  const dispatch = createEventDispatcher();

  function onCommit(e) {
    dispatch("commit", e.detail);
  }
</script>

<div>
  {#each images as image}
    <GalleryImage bind:chosen={chosen} width={columnWidth} image={image} on:commit={onCommit}/>
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