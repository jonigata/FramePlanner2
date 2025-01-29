<script lang="ts">
  import type { Media } from "../lib/layeredCanvas/dataModels/media";

  export let media: Media;
  export let onClick: () => void = () => {};
  export let showControls: boolean = true;

  function getVideoSource(media: Media) {
    return (media.drawSource as HTMLVideoElement).src;
  }

  let container: HTMLDivElement;

  $: if (container && media && media.type !== 'video') {
    // 既存の子要素をクリア
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    // canvasを追加
    container.appendChild(media.drawSourceCanvas);
  }
</script>

<div class="media-frame">
  {#if media.type === 'video' && media.isLoaded}
    <video 
      src={getVideoSource(media)}
      controls={showControls}
      class="media-element"
      draggable="true"
      on:click={onClick}
    >
    </video>
  {:else}
    <div 
      class="canvas-container"
      bind:this={container}
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
  .canvas-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .canvas-container :global(canvas) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>