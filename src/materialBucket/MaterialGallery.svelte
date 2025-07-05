<script lang="ts">
  import Gallery from '../gallery/Gallery.svelte';
  import type { GalleryItem } from "../gallery/gallery";
  import { dropzone } from '../utils/dropzone';
  import { createCanvasFromBlob, createVideoFromBlob } from '../lib/layeredCanvas/tools/imageUtil';
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import type { Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
  import { bookOperators, redrawToken } from '../bookeditor/workspaceStore';
  import { Film } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia, VideoMedia, type Media, buildMedia } from '../lib/layeredCanvas/dataModels/media';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Node, BindId } from '../lib/filesystem/fileSystem';
  import { saveMaterialToFolder, deleteMaterialFromFolder } from '../filemanager/fileManagerStore';

  export let targetNode: Node | null = null;

  $: displayMaterialImages(targetNode);

  const dispatch = createEventDispatcher();
  let items: (() => Promise<Media[]>)[] = [];
  let bindIds = new WeakMap<(() => Promise<Media[]>) | Media, BindId>();

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
    const bindId = bindIds.get(e.detail);
    if (targetNode == null || bindId == null) return;
    const folder = targetNode.asFolder()!;
    await deleteMaterialFromFolder(folder, bindId);
  }

  async function onFileDrop(files: FileList) {
    if (targetNode == null) return;
    const folder = targetNode.asFolder()!;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/svg')) continue;
      
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        // 非同期関数を作成してitemsに追加
        const loadMedia = async (): Promise<Media[]> => {
          let media: Media;
          if (file.type.startsWith('image/')) {
            const canvas = await createCanvasFromBlob(file);
            media = new ImageMedia(canvas);
          } else {
            const video = await createVideoFromBlob(file);
            media = new VideoMedia(video);
          }
          
          const bindId = await saveMaterialToFolder(folder, media, file.name);
          bindIds.set(media, bindId);
          return [media];
        };
        
        items.push(loadMedia);
      }
    }
    items = items; // リアクティブ更新をトリガー
  }

  async function displayMaterialImages(node: Node | null) {
    if (node == null) return;
    const folder = node.asFolder()!;
    
    const materials = await folder.listEmbodied();
    const newItems: (() => Promise<Media[]>)[] = [];
    const newBindIds = new WeakMap<(() => Promise<Media[]>) | Media, BindId>();
    
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i][2];
      const file = material.asFile()!;
      const bindId = materials[i][0];
      
      // 非同期関数を作成
      const loadMedia = async (): Promise<Media[]> => {
        const mediaResource = await file.readMediaResource();
        const media = buildMedia(mediaResource);
        newBindIds.set(media, bindId);
        return [media];
      };
      
      newItems.push(loadMedia);
      newBindIds.set(loadMedia, bindId);
    }
    
    items = newItems;
    bindIds = newBindIds;
  }

  onMount(() => {
    displayMaterialImages(targetNode);
  });
</script>

<div class="dropzone" use:dropzone={onFileDrop}>
  <Gallery columnWidth={220} referable={false} bind:items={items} on:commit={onChooseImage} on:dragstart={onChildDragStart} on:delete={onDelete}/>
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