<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { materialBucketOpen } from './materialBucketStore';
	import Gallery from '../generator/Gallery.svelte';
  import { loading } from '../utils/loadingStore'
  import { deleteMaterialCanvas, fileSystem, saveMaterialCanvas } from '../filemanager/fileManagerStore';
  import type { Folder } from '../lib/filesystem/fileSystem';
  import { dropzone } from '../utils/dropzone';
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import type { Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { bookEditor, redrawToken } from '../bookeditor/bookStore';
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import { createCanvasFromBlob, createCanvasFromImage } from '../utils/imageUtil';

  let gallery: HTMLCanvasElement[];

  function onChooseImage(e: CustomEvent<HTMLCanvasElement>) {
    console.log("onChooseImage");

    const page = $bookEditor.getFocusedPage();

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
    const film = new Film();
    film.media = new ImageMedia(canvas);
    bubble.filmStack.films.push(film);
    page.bubbles.push(bubble);
    $bookEditor.focusBubble(page, bubble);
    $redrawToken = true;
  }

  function onChildDragStart(e: CustomEvent<HTMLImageElement>) {
    console.log("onDragStart");
    setTimeout(() => {
      $materialBucketOpen = false;
    }, 0);
  }

  function onDelete(e: CustomEvent<HTMLImageElement>) {
    console.log("onDelete");
    deleteMaterialCanvas($fileSystem, e.detail["materialBindId"]);
  }

  async function onFileDrop(files: FileList) {
    console.log("onFileDrop", files);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const canvas = await createCanvasFromBlob(file);
      const bindId = await saveMaterialCanvas($fileSystem, canvas);
      canvas["materialBindId"] = bindId;
      gallery.push(canvas);
    }
    gallery = gallery;
  }

  async function displayMaterialImages() {
    console.log("displayMaterialImages");
    $loading = true;
    const root = await $fileSystem.getRoot();
    const materialFolder = (await root.getNodesByName('素材'))[0] as Folder;
    const materials = await materialFolder.listEmbodied();
    const canvases = [];
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i][2];
      const canvas = await material.asFile().readCanvas();
      canvas["materialBindId"] = materials[i][0];
      canvases.push(canvas);
    }
    gallery = canvases;
    $loading = false;
  }

  $: if ($materialBucketOpen) {
    displayMaterialImages();
  }

</script>


<div class="drawer-outer">
  <Drawer open={$materialBucketOpen} size="720px" on:clickAway={() => $materialBucketOpen = false}>
    <div class="dropzone" use:dropzone={onFileDrop}>
      <div class="drawer-content" use:dropzone={onFileDrop}>
        <Gallery columnWidth={220} bind:canvases={gallery} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
      </div>
    </div>  
  </Drawer>
</div>

<style>
  .dropzone {
    width: 100%;
    height: 100%;
  }
  .drawer-content {
    width: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding-top: 16px;
    padding-left: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  :global(.drag-over) {
    background-color: #f0f0f0;
  }
</style>