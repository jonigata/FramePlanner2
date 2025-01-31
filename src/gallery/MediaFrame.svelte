<script lang="ts">
  import type { Media } from "../lib/layeredCanvas/dataModels/media";

  export let media: Media;
  export let onClick: () => void = () => {};
  export let showControls: boolean = true;

  function getVideoSource(media: Media) {
    return (media.drawSource as HTMLVideoElement).src;
  }

  let imageDataUrl: string | null = null;

  async function updateImageDataUrl() {
    if (media.type === 'image' && media.drawSourceCanvas) {
      const blob = await new Promise<Blob | null>((resolve) => {
        media.drawSourceCanvas.toBlob(resolve, 'image/png');
      });

      if (blob) {
        imageDataUrl = URL.createObjectURL(blob);
      }
    }
  }

  // メディアが変更されたら画像URLを更新
  $: if (media.type === 'image') {
    updateImageDataUrl();
  }
</script>

<div class="media-frame">
  {#if media.type === 'video' && media.isLoaded}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video 
      src={getVideoSource(media)}
      controls={showControls}
      class="media-element"
      draggable="true"
      on:click={onClick}
    />
  {:else if media.type === 'image' && imageDataUrl}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img
      src={imageDataUrl}
      class="media-element"
      alt=""
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
