<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { ImageMedia, VideoMedia, type Media } from '../lib/layeredCanvas/dataModels/media';
  import GalleryElement from './GalleryElement.svelte';
  import MediaLoading from './MediaLoading.svelte';
  import type { GalleryItem } from './gallery';

  export let item: GalleryItem;
  export let columnWidth: number;
  export let chosen: Media | null;
  export let refered: Media | null;
  export let accessable: boolean;
  export let referable: boolean;

  let medias: Media[] | undefined;
  let observerTarget: HTMLDivElement; // 監視用の DOM 要素

  const distach = createEventDispatcher();

  function onDelete(e: CustomEvent<Media>) {
    console.log('GalleryMember.onDelete(before)', e.detail, medias!.length);
    medias = medias!.filter(c => c !== e.detail);
    console.log('GalleryMember.onDelete(after)', e.detail, medias!.length);
    if (medias!.length === 0) {
      distach('delete', item);
    }
  }

  onMount(() => {
    // すでに単一の ImageMedia / VideoMedia であれば即座に読み込む
    if (item instanceof ImageMedia || item instanceof VideoMedia) {
      medias = [item];
      return;
    }

    // IntersectionObserver をプレースホルダー用の要素にだけ紐付ける
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !medias) {
          (item as () => Promise<Media[]>)().then(result => {
            medias = result;
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerTarget);

    return () => {
      observer.disconnect();
    };
  });
</script>

{#if !medias}
  <!-- ロードされる前のみ表示される 1マスぶんのプレースホルダー -->
  <div bind:this={observerTarget}>
    <MediaLoading width={columnWidth} />
  </div>
{:else}
  {#each medias as media}
    <GalleryElement
      bind:chosen
      bind:refered
      width={columnWidth}
      media={media}
      {accessable}
      {referable}
      on:commit
      on:delete={onDelete}
      on:dragstart
    />
  {/each}
{/if}
