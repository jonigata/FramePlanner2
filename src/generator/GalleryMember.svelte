<script lang="ts">
  import { onMount } from 'svelte';
  import { ImageMedia, VideoMedia, type Media } from '../lib/layeredCanvas/dataModels/media';
  import GalleryElement from './GalleryElement.svelte';
  import GalleryLoading from './GalleryLoading.svelte';
  import type { GalleryItem } from './gallery';

  export let item: GalleryItem;
  export let columnWidth: number;
  export let chosen: Media | null;
  export let refered: Media | null;
  export let accessable: boolean;

  let isIntersecting = false;
  let promise: Promise<Media[]> | null = null;
  let element: HTMLElement;

  onMount(() => {
    if (item instanceof ImageMedia || item instanceof VideoMedia) {
      promise = Promise.resolve([item]);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        isIntersecting = entry.isIntersecting;
        if (isIntersecting && !promise) {
          promise = (item as (() => Promise<Media[]>))();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  });
</script>

<div bind:this={element}>
  {#if !promise}
    <GalleryLoading width={columnWidth}/>
  {:else }
    {#await promise}
      <GalleryLoading width={columnWidth}/>
    {:then resolvedMedias}
      {#each resolvedMedias as resolvedMedia}
        <GalleryElement 
          bind:chosen
          bind:refered
          width={columnWidth}
          media={resolvedMedia}
          {accessable}
          on:commit
          on:delete
          on:dragstart
        />
      {/each}
    {/await}
  {/if}
</div>