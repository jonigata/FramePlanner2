<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { materialBucketOpen } from './materialBucketStore';
	import Gallery from '../generator/Gallery.svelte';
  import { loading } from '../utils/loadingStore'
  import { deleteMaterialImage, fileSystem, saveMaterialImage } from '../filemanager/fileManagerStore';
  import { collectGarbage } from '../utils/garbageCollection';
  import type { NodeId, Folder } from '../lib/filesystem/fileSystem';
  import { dropzone } from '../utils/dropzone';

  export let gallery: HTMLImageElement[];

  function onChooseImage(e: CustomEvent<HTMLImageElement>) {
    console.log("onChooseImage");
    $materialBucketOpen = false;
  }

  function onChildDragStart(e: CustomEvent<HTMLImageElement>) {
    console.log("onDragStart");
    $materialBucketOpen = false;
  }

  function onDelete(e: CustomEvent<HTMLImageElement>) {
    console.log("onDelete");
    deleteMaterialImage($fileSystem, e.detail["materialBindId"]);
  }

  async function onFileDrop(files: FileList) {
    console.log("onFileDrop", files);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const bindId = await saveMaterialImage($fileSystem, img);
      img["materialBindId"] = bindId;
      gallery.push(img);
    }
    gallery = gallery;
  }

  async function displayMaterialImages() {
    console.log("displayMaterialImages");
    $loading = true;
    const root = await $fileSystem.getRoot();
    const materialFolder = (await root.getNodesByName('素材'))[0] as Folder;
    const materials = await materialFolder.listEmbodied();
    const images = [];
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i][2];
      const img = await material.asFile().readImage();
      img["materialBindId"] = materials[i][0];
      images.push(img);
    }
    gallery = images;
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
        <Gallery columnWidth={220} bind:images={gallery} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
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