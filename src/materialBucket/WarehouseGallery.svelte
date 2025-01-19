<script lang="ts">
  import { onMount } from 'svelte';
  import Gallery from '../generator/Gallery.svelte';
  import { loading } from '../utils/loadingStore'
  import { fileSystem } from '../filemanager/fileManagerStore';
  import { getEntries, saveEntity, deleteEntry } from '../filemanager/warehouse';
  import { bookEditor, redrawToken } from '../bookeditor/bookStore';
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import type { Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher } from 'svelte';
  import { pollMediaStatus } from '../supabase';
  import { createCanvasFromImage, createCanvasFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { ls } from '../lib/filesystem/fileSystem';

  const dispatch = createEventDispatcher();
  let gallery: HTMLCanvasElement[] | null = null;

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

  async function displayWarehouseImages() {
    $loading = true;
    const canvases: HTMLCanvasElement[] = [];

    console.log(await ls($fileSystem!, "倉庫"));
    
    for await (const entry of getEntries($fileSystem!)) {
      console.log(entry);
      if (entry.type === "request") {
        const loadingCanvas = await createLoadingCanvas(512, 512);
        const loadingIndex = canvases.length;
        canvases.push(loadingCanvas);
        
        pollMediaStatus(entry.mediaType, entry.mode, entry.requestId).then(async ({urls, mediaResources}) => {
          if (mediaResources.length > 0) {
            console.log("The images are ready!");

            await saveEntity($fileSystem!, entry.mediaType, entry.mode, entry.requestId, urls);

            // TODO: Video対応
            const canvases = mediaResources.filter((mediaResource) => mediaResource instanceof HTMLCanvasElement);

            canvases.forEach((mediaResource) => {
              (mediaResource as any)["requestId"] = entry.requestId;
            });

            canvases.splice(loadingIndex, 1, ...canvases);
            gallery = [...canvases];
          }
        }).catch(console.error);
      }
      if (entry.type === "entity") {
        console.log("completed request", entry.imageUrls);
        entry.imageUrls.forEach(async (url) => {
          const response = await fetch(url);
          console.log("response", response);
          const blob = await response.blob();
          const canvas = await createCanvasFromBlob(blob);
          console.log("canvas", canvas.width, canvas.height);
          (canvas as any)["requestId"] = entry.requestId;
          canvases.push(canvas);
          gallery = [...canvases];
        });
      }
    }

    console.log("done");
    $loading = false;
  }

  onMount(displayWarehouseImages);
</script>

<div class="gallery-content">
  {#if gallery != null}
    <Gallery columnWidth={220} bind:canvases={gallery} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
  {/if}
</div>

<style>
  .gallery-content {
    width: 100%;
    display: flex;
  }
</style>