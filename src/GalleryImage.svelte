<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { imageGeneratorOpen } from "./imageGeneratorStore";
  import drop from './assets/drop.png';

  export let image = null;
  export let width = 160;
  export let chosen = null;
  let container;

  const dispatch = createEventDispatcher();

  function onClick() {
    if (chosen === image) {
      dispatch("commit", image);
      return;
    }
    chosen = image;
  }

  // fix aspect ratio
  function getHeight() {
    return (image.naturalHeight / image.naturalWidth) * width;
  }

  onMount(() => {
    console.log("change image size", image.width, image.height, $imageGeneratorOpen);
    if ($imageGeneratorOpen) {
      image.width = width;
      image.height = getHeight();
    }
    container.appendChild(image);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="frame" class:selected={chosen === image} bind:this={container} on:click={onClick} style="width: {width}px; height: {getHeight()};">
  <div class="delete-button" on:click={() => dispatch("delete", image)}>
    <img src={drop} alt="delete" />
  </div>
</div>

<style>
  .frame {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .selected {
    border: 2px solid blue;
  }
  .frame > img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .delete-button {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1;
    cursor: pointer;
    width: 20px;
    height: 20px;
  }
</style>