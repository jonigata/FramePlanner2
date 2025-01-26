<script lang="ts">
  import type { Media } from "../lib/layeredCanvas/dataModels/media";

  export let media: Media;
  export let onClick: () => void = () => {};

  function getVideoSource(media: Media) {
    return (media.drawSource as HTMLVideoElement).src;
  }
</script>

<div class="media-frame">
  {#if media.type === 'video' && media.isLoaded}
    <video 
      src={getVideoSource(media)}
      controls
      class="media-element"
      draggable="true"
      on:click={onClick}
    >
      <track kind="captions" />
    </video>
  {:else}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img 
      src={media.drawSourceCanvas.toDataURL()}
      class="media-element"
      alt="Media content"
      draggable="true"
      on:click={onClick}
    />
  {/if}
</div>

<style>
  .media-frame {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    position: relative;
  }
  .media-element {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>