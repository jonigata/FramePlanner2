<script lang="ts">
  import { modalStore } from "@skeletonlabs/skeleton";
  import { imageViewerTarget } from "./imageViewerStore";

  let containerDiv: HTMLDivElement;
  let img: HTMLImageElement;

  $: onCanvasChanged($imageViewerTarget, img);

  function onCanvasChanged(canvas: HTMLCanvasElement | null, imgElement: HTMLImageElement | null) {
    if (!canvas || !imgElement) return;
    
    // Convert Canvas to data URL and set it as the image source
    const dataURL = canvas.toDataURL();
    imgElement.src = dataURL;
  }

</script>

<div class="page-container" bind:this={containerDiv}>
  <!-- svelte-ignore a11y-img-redundant-alt -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img
    bind:this={img}
    class="draggable-image"
    alt="Viewer image"
    draggable="true"
    on:click={modalStore.close}
  />
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
  .draggable-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>