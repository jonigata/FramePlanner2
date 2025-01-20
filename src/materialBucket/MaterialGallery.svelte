<script lang="ts">
  import Gallery from '../generator/Gallery.svelte';
  import { loading } from '../utils/loadingStore'
  import { deleteMaterial, fileSystem, saveMaterial } from '../filemanager/fileManagerStore';
  import { dropzone } from '../utils/dropzone';
  import { createCanvasFromBlob, createImageFromBlob, createVideoFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import type { Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { bookEditor, redrawToken } from '../bookeditor/bookStore';
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia, VideoMedia, type Media, buildMedia } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();
  let gallery: Media[] | null = null;

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
    deleteMaterial($fileSystem!, (e.detail as any)["materialBindId"]);
  }

  async function onFileDrop(files: FileList) {
    if (gallery == null) { return; }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/svg')) { return; } // 念の為
      if (file.type.startsWith('image/')) {
        const canvas = await createCanvasFromBlob(file);
        const media = new ImageMedia(canvas);
        const bindId = await saveMaterial($fileSystem!, media);
        (canvas as any)["materialBindId"] = bindId;
        gallery.push(media);
      }
      if (file.type.startsWith('video/')) {
        const video = await createVideoFromBlob(file);
        const media = new VideoMedia(video);
        const bindId = await saveMaterial($fileSystem!, media);
        (video as any)["materialBindId"] = bindId;
        gallery.push(media);
      }

      const canvas = await createCanvasFromBlob(file);
    }
    gallery = gallery;
  }

  async function displayMaterialImages() {
    $loading = true;
    const root = await $fileSystem!.getRoot();
    const materialFolder = (await root.getNodesByName('素材'))[0].asFolder()!;
    const materials = await materialFolder.listEmbodied();
    const mediaResources = [];
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i][2];
      const mediaResource = await material.asFile()!.readMediaResource();
      (mediaResource as any)["materialBindId"] = materials[i][0];
      mediaResources.push(buildMedia(mediaResource));
    }
    gallery = mediaResources;
    $loading = false;
  }

  onMount(displayMaterialImages);
</script>

<div class="dropzone" use:dropzone={onFileDrop}>
  <div class="gallery-content" use:dropzone={onFileDrop}>
    {#if gallery != null}
      <Gallery columnWidth={220} bind:items={gallery} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
    {/if}
  </div>
</div>

<style>
  .dropzone {
    width: 100%;
    min-height: 220px;
    height: auto;
  }
  .gallery-content {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    min-height: 220px;
    height: auto;
  }
  :global(.drag-over) {
    background-color: #f0f0f0;
  }
</style>