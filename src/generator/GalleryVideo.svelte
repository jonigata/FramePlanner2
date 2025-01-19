<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import { imageViewerTarget } from '../utils/imageViewerStore';
  import { toolTip } from '../utils/passiveToolTipStore';

  import drop from '../assets/drop.png';
  import reference from '../assets/reference.png';
  import referenceSelected from '../assets/reference-selected.png';
  import telescope from '../assets/telescope.png';

  export let video: HTMLVideoElement;
  export let width = 160;
  export let chosen: HTMLVideoElement | null = null;
  export let refered: HTMLVideoElement | null = null;
  export let accessable: boolean = true;

  let container: HTMLDivElement;
  let height: number = 160;
  let videoElement: HTMLVideoElement;

  const dispatch = createEventDispatcher();

  $: onVideoChanged(video);
  function onVideoChanged(v: HTMLVideoElement) {
    if (v) {
      height = getHeight();
      const w = Math.min(width, v.videoWidth);
      const h = Math.min(height, v.videoHeight);

      videoElement = v.cloneNode() as HTMLVideoElement;
      videoElement.style.width = `${w}px`;
      videoElement.style.height = `${h}px`;
      videoElement.style.position = 'absolute';
      videoElement.style.top = (width / 2 - w / 2).toString() + 'px';
      videoElement.style.left = (height / 2 - h / 2).toString() + 'px';
      container.appendChild(videoElement);
    }
  }

  function getHeight(): number {
    if (!video) return width;
    const aspect = video.videoHeight / video.videoWidth;
    return width * aspect;
  }

  function onClick() {
    if (chosen === video) {
      dispatch("commit", video);
      return;
    }
    chosen = video;
  }

  function onDelete(e: MouseEvent, video: HTMLVideoElement) {
    e.stopPropagation();
    dispatch("delete", video);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="relative border-2 rounded-lg overflow-hidden cursor-pointer hover:border-surface-500"
  class:border-primary-500={chosen === video}
  class:border-secondary-500={refered === video}
  style="width: {width}px; height: {height}px;"
  on:click={onClick}
  bind:this={container}
>
  {#if !accessable}
    <div class="absolute inset-0 bg-surface-900/50 z-10 flex items-center justify-center">
      <img src={telescope} alt="telescope" class="w-8 h-8" />
    </div>
  {/if}

  <div class="absolute top-2 right-2 z-20 flex gap-1">
    {#if chosen !== video}
      <button class="btn-icon variant-filled-surface" on:click|stopPropagation={() => dispatch("reference", video)}>
        <img src={refered === video ? referenceSelected : reference} alt="reference" class="w-4 h-4" />
      </button>
    {/if}
    <button class="btn-icon variant-filled-surface" on:click={(e) => onDelete(e, video)}>
      <img src={drop} alt="delete" class="w-4 h-4" />
    </button>
  </div>
</div>

<style>
  .btn-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>