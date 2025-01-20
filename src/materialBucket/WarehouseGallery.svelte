<script lang="ts">
  import { onMount } from 'svelte';
  import Gallery from '../generator/Gallery.svelte';
  import { fileSystem } from '../filemanager/fileManagerStore';
  import { getEntries, saveEntity, deleteEntry } from '../filemanager/warehouse';
  import { bookEditor, redrawToken } from '../bookeditor/bookStore';
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import type { Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { buildMedia, ImageMedia, type Media, type MediaType } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher } from 'svelte';
  import { pollMediaStatus } from '../supabase';
  import { createCanvasFromBlob, createVideoFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { ls } from '../lib/filesystem/fileSystem';

  const dispatch = createEventDispatcher();
  let items: (() => Promise<Media[]>)[] = [];

  function onChooseImage(e: CustomEvent<HTMLCanvasElement>) {
    const page = $bookEditor!.getFocusedPage();
    const canvas = e.detail;
    const bubble = new Bubble();
    const paperSize = page.paperSize;
    const imageSize = [canvas.width, canvas.height];
    const x = Math.random() * (paperSize[0] - imageSize[0]);
    const y = Math.random() * (paperSize[1] - imageSize[1]);
    bubble.setPhysicalRect(paperSize, [x, y, ...imageSize] as Rect);
    bubble.forceEnoughSize(paperSize);
    bubble.shape = "none";
    bubble.initOptions();
    bubble.text = "";
    const film = new Film(new ImageMedia(canvas));
    bubble.filmStack.films.push(film);
    page.bubbles.push(bubble);
    $bookEditor!.focusBubble(page, bubble);
    $redrawToken = true;
  }

  function onChildDragStart(e: CustomEvent<HTMLCanvasElement>) {
    dispatch('dragstart', e.detail);
  }

  function onDelete(e: CustomEvent<HTMLCanvasElement>) {
    deleteEntry($fileSystem!, (e.detail as any)["requestId"]);
  }

  async function createLoadingCanvas(width: number, height: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // グレーの背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // "Loading..."テキスト
    ctx.fillStyle = '#666666';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', width/2, height/2);
    
    return canvas;
  }

  async function handleRequest(mediaType: MediaType, mode: string, requestId: string) {
    try {
      const { mediaResources, urls } = await pollMediaStatus(mediaType, mode, requestId);
      await saveEntity($fileSystem!, mediaType, mode, requestId, urls);
      return mediaResources.map((mediaResource) => {
        const media = buildMedia(mediaResource);
        (media as any)["requestId"] = requestId;
        return media;
      });
    }
    catch (e) {
      // fal.aiは7日間しかリクエストを保存しないので、おそらくそれ
      console.log(e);
      deleteEntry($fileSystem!, requestId);
      return [];
    }
  }

  async function handleEntity(mediaType: MediaType, requestId: string, mediaUrls: string[]) {
    const mediaResources = await Promise.all(mediaUrls.map(async (url) => {
      const response = await fetch(url);
      const blob = await response.blob();
      if (mediaType === "image") {
        const canvas = await createCanvasFromBlob(blob);
        (canvas as any)["requestId"] = requestId;
        return canvas;
      } else if (mediaType === "video") {
        const video = await createVideoFromBlob(blob);
        (video as any)["requestId"] = requestId;
        return video;
      }
      throw new Error("Invalid media type");
    }));
    return mediaResources.map((media) => {
      return buildMedia(media);
    });
  }

  async function displayWarehouseImages() {
    console.log(await ls($fileSystem!, "倉庫"));

    items = [];
    for (const entry of await getEntries($fileSystem!)) {
      console.log(entry);

      switch (entry.type) {
        case "request":
          items.push(
            async () => {
              return await handleRequest(entry.mediaType, entry.mode, entry.requestId);
            });
          break;
        case "entity":
          items.push(
            async () => {
              return await handleEntity(entry.mediaType, entry.requestId, entry.mediaUrls);
            });
          break;
        default:
          throw new Error("Invalid entry type");
      }
    }
    items = items;

    console.log("done");
  }

  onMount(displayWarehouseImages);
</script>

<div class="gallery-content">
  <Gallery columnWidth={220} bind:items={items} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
</div>

<style>
  .gallery-content {
    width: 100%;
    display: flex;
  }
</style>