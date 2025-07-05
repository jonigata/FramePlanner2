<script lang="ts">
  import Gallery from '../gallery/Gallery.svelte';
  import type { GalleryItem } from "../gallery/gallery";
  import { loading } from '../utils/loadingStore'
  import { dropzone } from '../utils/dropzone';
  import { saveMaterialToFolder, deleteMaterialFromFolder } from '../filemanager/fileManagerStore';
  import { createCanvasFromBlob, createVideoFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import type { Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { bookOperators, redrawToken } from '../bookeditor/workspaceStore';
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia, VideoMedia, type Media, buildMedia } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { FileSystem, BindId, Node } from '../lib/filesystem/fileSystem';

  export let targetNode: Node | null = null;

  $: displayMaterialImages(targetNode);

  const dispatch = createEventDispatcher();
  let gallery: Media[] | null = null;
  let bindIds = new WeakMap<Media, BindId>();

  function onChooseImage(e: CustomEvent<Media>) {
    const page = $bookOperators!.getFocusedPage();
    const canvas = e.detail;
    const bubble = new Bubble();
    const paperSize = page.paperSize;
    const imageSize = e.detail.size;
    const x = Math.random() * (paperSize[0] - imageSize[0]);
    const y = Math.random() * (paperSize[1] - imageSize[1]);
    bubble.setPhysicalRect(paperSize, [x, y, ...imageSize] as Rect);
    bubble.forceEnoughSize(paperSize);
    bubble.shape = "none";
    bubble.initOptions();
    bubble.text = "";
    const film = new Film(buildMedia(e.detail.persistentSource));
    bubble.filmStack.films.push(film);
    page.bubbles.push(bubble);
    $bookOperators!.focusBubble(page, bubble);
    $redrawToken = true;
  }

  function onChildDragStart(e: CustomEvent<Media>) {
    dispatch('dragstart', e.detail);
  }

  async function onDelete(e: CustomEvent<GalleryItem>) {
    if (targetNode == null) return;
    const bindId = bindIds.get(e.detail as Media);
    if (bindId == null) return;
    const folder = targetNode.asFolder()!;
    await deleteMaterialFromFolder(folder, bindId);
    // ギャラリーから削除
    gallery = gallery!.filter(item => item !== e.detail);
  }

  async function onFileDrop(files: FileList) {
    if (gallery == null || targetNode == null) { return; }
    const folder = targetNode.asFolder()!;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/svg')) { continue; } // 念の為
      if (file.type.startsWith('image/')) {
        const canvas = await createCanvasFromBlob(file);
        const media = new ImageMedia(canvas);
        const bindId = await saveMaterialToFolder(folder, media, file.name);
        bindIds.set(media, bindId);
        gallery.push(media);
      }
      if (file.type.startsWith('video/')) {
        const video = await createVideoFromBlob(file);
        const media = new VideoMedia(video);
        const bindId = await saveMaterialToFolder(folder, media, file.name);
        bindIds.set(media, bindId);
        gallery.push(media);
      }
    }
    gallery = gallery;
  }

  async function displayMaterialImages(node: Node | null) {
    if (node == null) { return; }
    const folder = node.asFolder()!;
    
    $loading = true;
    const materials = await folder.listEmbodied();
    const newBindIds = new WeakMap<Media, BindId>();
    const mediaResources = [];
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i][2];
      const file = material.asFile()!;
      
      const mediaResource = await file.readMediaResource();
      const media = buildMedia(mediaResource);
      newBindIds.set(media, materials[i][0]);
      mediaResources.push(media);
    }
    gallery = mediaResources;
    bindIds = newBindIds;
    $loading = false;
  }

  onMount(() => {
    displayMaterialImages(targetNode);
  });
</script>

<div class="dropzone" use:dropzone={onFileDrop}>
  {#if gallery != null}
    <Gallery columnWidth={220} referable={false} bind:items={gallery} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
  {/if}
</div>

<style>
  .dropzone {
    width: 100%;
    height: 100%;
    overflow: auto;
    transition: all 0.2s;
    border-radius: 4px;
    position: relative;
  }
  :global(.dropzone.drag-over) {
    background-color: rgba(0, 123, 255, 0.15) !important;
    outline: 3px dashed rgba(0, 123, 255, 0.6) !important;
    outline-offset: -3px !important;
    z-index: 10 !important;
  }
</style>