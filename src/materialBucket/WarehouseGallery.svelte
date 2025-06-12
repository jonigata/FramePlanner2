<script lang="ts">
  import { onMount } from 'svelte';
  import Gallery from '../gallery/Gallery.svelte';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import { getEntries, saveEntity, deleteEntry } from '../filemanager/warehouse';
  import { buildMedia, type Media, type MediaType } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher } from 'svelte';
  import { pollMediaStatus } from '../supabase';
  import { createCanvasFromBlob, createVideoFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { ls } from '../lib/filesystem/fileSystem';
  import type { GalleryItem } from "../gallery/gallery";

  const dispatch = createEventDispatcher();
  let items: (() => Promise<Media[]>)[] = [];
  let requestIds = new WeakMap<(Media | (() => Promise<Media[]>)), string>();

  function onChildDragStart(e: CustomEvent<Media>) {
    dispatch('dragstart', e.detail);
  }

  async function onDelete(e: CustomEvent<GalleryItem>) {
    console.log("onDelete", e.detail);
    const requestId = requestIds.get(e.detail);
    deleteEntry($gadgetFileSystem!, requestId!);
  }

  async function handleRequest(mediaType: MediaType, mode: string, request_id: string) {
    try {
      const { mediaResources, urls } = await pollMediaStatus({mediaType, mode, requestId: request_id});
      await saveEntity($gadgetFileSystem!, mediaType, mode, request_id, urls);
      return mediaResources.map((mediaResource) => {
        const media = buildMedia(mediaResource);
        return media;
      });
    }
    catch (e) {
      // fal.aiは7日間しかリクエストを保存しないので、おそらくそれ
      console.log(e);
      deleteEntry($gadgetFileSystem!, request_id);
      return [];
    }
  }

  async function handleEntity(mediaType: MediaType, requestId: string, mediaUrls: string[]) {
    const mediaResources = await Promise.all(mediaUrls.map(async (url) => {
      const response = await fetch(url);
      const blob = await response.blob();
      if (mediaType === "image") {
        const canvas = await createCanvasFromBlob(blob);
        return canvas;
      } else if (mediaType === "video") {
        const video = await createVideoFromBlob(blob);
        return video;
      }
      throw new Error("Invalid media type");
    }));
    return mediaResources.map((mediaResource) => {
      const media = buildMedia(mediaResource);
      return media;
    });
  }

  async function displayWarehouseImages() {
    console.log(await ls($gadgetFileSystem!, "倉庫"));

    const newItems = [];
    const newRequestIds = new WeakMap<(Media | (() => Promise<Media[]>)), string>();
    for (const entry of await getEntries($gadgetFileSystem!)) {
      console.log(entry);

      switch (entry.type) {
        case "request":
          const f = async () => {
            return await handleRequest(entry.mediaType, entry.mode, entry.requestId);
          };
          newItems.push(f);
          newRequestIds.set(f, entry.requestId);
          break;
        case "entity":
          const f2 = async () => {
            return await handleEntity(entry.mediaType, entry.requestId, entry.mediaUrls);
          };
          newItems.push(f2);
          newRequestIds.set(f2, entry.requestId);
          break;
        default:
          throw new Error("Invalid entry type");
      }
    }
    items = newItems;
    requestIds = newRequestIds;

    console.log("done");
  }

  onMount(displayWarehouseImages);
</script>

<div class="gallery-content">
  <Gallery columnWidth={220} bind:items={items} on:dragstart={onChildDragStart} on:delete={onDelete}/>
</div>

<style>
  .gallery-content {
    width: 100%;
    display: flex;
  }
</style>