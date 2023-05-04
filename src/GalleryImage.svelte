<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";

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
    image.width = width;
    image.height = getHeight();
    container.appendChild(image);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class:selected={chosen === image} bind:this={container} on:click={onClick} style="width: {width}px; height: {getHeight()};">
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }
  .selected {
    border: 2px solid blue;
  }
</style>