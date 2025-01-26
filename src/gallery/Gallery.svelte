<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Media } from "../lib/layeredCanvas/dataModels/media";
  import GalleryMember from "./GalleryMember.svelte";
  import type { GalleryItem } from "./gallery";

  export let items: GalleryItem[];
  export let columnWidth: number;
  export let accessable: boolean = true;

  export let chosen: Media | null = null;
  export let refered: Media | null = null;

  const dispatch = createEventDispatcher();

  function onCommit(e: CustomEvent<Media>) {
    dispatch("commit", e.detail);
  }

  async function onDelete(e: CustomEvent<GalleryItem>) {
    items = items.filter(c => c !== e.detail);
    dispatch("delete", e.detail);
  }

  function onDragStart(e: CustomEvent<Media>) {
    dispatch("dragstart", e.detail);
  }
</script>

<div class="gallery">
  {#each items as item}
    <GalleryMember
      item={item}
      {columnWidth}
      bind:chosen
      bind:refered
      {accessable}
      on:commit={onCommit}
      on:delete={onDelete}
      on:dragstart={onDragStart}
    />
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