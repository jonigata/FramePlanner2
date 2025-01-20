<script lang="ts">
  import { modalStore } from "@skeletonlabs/skeleton";
  import { imageViewerTarget } from "./imageViewerStore";
  import type { Media } from "../lib/layeredCanvas/dataModels/media";

  $: media = $imageViewerTarget;

  function getVideo(media: Media) {
    return media.drawSource as HTMLVideoElement;
  }
</script>

<div class="page-container">
  {#if media}
    {#if media.type === 'video' && media.isLoaded}
      <video 
        src={getVideo(media).src}
        controls
        class="draggable-media"
        draggable="true"
        on:click={() => modalStore.close()}
      >
        <track kind="captions" />
      </video>
    {:else}
      <img 
        src={media.drawSourceCanvas.toDataURL()}
        class="draggable-media"
        alt="Viewer image"
        draggable="true"
        on:click={() => modalStore.close()}
      />
    {/if}
  {/if}
</div>

<style>
  .page-container {
    width: 80svw;
    height: 80svh;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    position: relative;
  }
  :global(.draggable-media) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>