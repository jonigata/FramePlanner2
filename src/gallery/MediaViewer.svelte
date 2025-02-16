<script lang="ts">
  import { modalStore } from "@skeletonlabs/skeleton";
  import { mediaViewerTarget } from "./mediaViewerStore";
  import MediaFrame from "./MediaFrame.svelte";
</script>

<div class="page-container">
  {#if $mediaViewerTarget}
    <div class="media-container">
      <MediaFrame 
        media={$mediaViewerTarget}
        on:click={() => modalStore.close()} 
      />
    </div>
  {/if}
</div>

<style>
  .page-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
  }
  .media-container {
    width: 80svw;
    height: 80svh;
  }
</style>