<script lang="ts">
  import { redrawToken } from '../bookeditor/bookStore';
  import type { Media } from "../lib/layeredCanvas/dataModels/media";
  import { canvasToBlob, computeAspectFitSize } from "../lib/layeredCanvas/tools/imageUtil";
  import MediaLoading from './MediaLoading.svelte';

  export let media: Media;
  export let showControls: boolean = true;
  export let useCanvas: boolean = false;

  function getVideoSource(media: Media) {
    return (media.drawSource as HTMLVideoElement).src;
  }

  let imageDataUrl: string | null = null;
  let canvas: HTMLCanvasElement;
  let containerDiv: HTMLDivElement;

  async function updateMediaDisplay() {
    if (media.type === 'image' && media.drawSourceCanvas) {
      if (!useCanvas) {
        const blob = await canvasToBlob(media.drawSourceCanvas);
        if (blob) {
          imageDataUrl = URL.createObjectURL(blob);
        }
      } else if (canvas && containerDiv) {
        const rect = containerDiv.getBoundingClientRect();
        const { width: targetWidth, height: targetHeight } = computeAspectFitSize(
          rect,
          media.size,
        );

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (ctx && media.drawSourceCanvas) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(media.drawSourceCanvas, 0, 0, targetWidth, targetHeight);
        }
      }
    }
  }

  // メディアが変更されたら表示を更新
  $: if (media.type === 'image') {
    updateMediaDisplay();
  }

  $: if ($redrawToken) {
    updateMediaDisplay();
  }

  // コンテナのリサイズを監視
  let resizeObserver: ResizeObserver;
  $: if (containerDiv && media.type === 'image' && useCanvas) {
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      updateMediaDisplay();
    });
    resizeObserver.observe(containerDiv);
  }
</script>

<div class="media-frame" bind:this={containerDiv}>
  {#if media.isLoaded}
    {#if media.type === 'video'}
      <!-- svelte-ignore a11y-media-has-caption -->
      <video 
        src={getVideoSource(media)}
        controls={showControls}
        class="media-element"
        draggable="true"
        on:click
      />
    {:else if media.type === 'image'}
      {#if useCanvas && media.drawSourceCanvas}
        <canvas
          bind:this={canvas}
          class="media-element"
          on:click
        />
      {:else if imageDataUrl}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img
          src={imageDataUrl}
          class="media-element"
          alt=""
          on:click
        />
      {/if}
    {/if}
  {:else}
    <MediaLoading />
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
