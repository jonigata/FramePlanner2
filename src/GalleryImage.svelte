<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { imageGeneratorOpen } from "./imageGeneratorStore";
  import drop from './assets/drop.png';
  import reference from './assets/reference.png';
  import referenceSelected from './assets/reference-selected.png';

  export let image = null;
  export let width = 160;
  export let chosen = null;
  export let refered = null;
  let container;

  const dispatch = createEventDispatcher();

  function onClick() {
    console.log("onClick");
    if (chosen === image) {
      dispatch("commit", image);
      return;
    }
    chosen = image;
  }

  function onDelete(e, image) {
    console.log("onDelete");
    e.stopPropagation();
    dispatch("delete", image);
  }

  function onRefer(e, image) {
    console.log("onRefer");
    e.stopPropagation();
    dispatch("refer", image);
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
  <div class="delete-button" on:click={e => onDelete(e, image)}>
    <img src={drop} alt="delete" />
  </div>
  <div class="reference-button" on:click={e => onRefer(e, image)}>
    {#if refered === image}
      <img src={referenceSelected} alt="reference"/>
    {:else}
      <img src={reference} alt="reference" />
    {/if}
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
  .reference-button {
    position: absolute;
    bottom: 4px;
    left: 4px;
    z-index: 1;
    cursor: pointer;
    width: 20px;
    height: 20px;
  }
</style>