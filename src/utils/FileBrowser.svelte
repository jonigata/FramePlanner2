<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
	import Gallery from '../gallery/Gallery.svelte';
  import { onMount } from 'svelte';
  import { collectGarbage } from '../utils/garbageCollection';
  import { mainBookFileSystem } from '../filemanager/fileManagerStore';
  import type { NodeId, File } from '../lib/filesystem/fileSystem';
  import { buildMedia, type Media } from '../lib/layeredCanvas/dataModels/media';
  import { _ } from 'svelte-i18n';

  let usedMedias: (() => Promise<Media[]>)[] = [];
  let strayMedias: (() => Promise<Media[]>)[] = [];

  async function loadMedia(file: File): Promise<Media[]> {
    const media = await file.readMediaResource();
    return [buildMedia(media)];
  }

  onMount(async () => {
    const fs = $mainBookFileSystem!;
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fs);

    usedMedias = [];
    let i = 0;
    for (const imageFile of usedImageFiles) {
      const file = (await fs.getNode(imageFile as NodeId))!.asFile()!;
      usedMedias.push(() => loadMedia(file));
      i++;
      if (i % 3 === 0) {
        usedMedias = usedMedias;
      }
    }

    strayMedias = [];
    i = 0;
    for (const imageFile of strayImageFiles) {
      const file = (await fs.getNode(imageFile as NodeId))!.asFile()!;
      strayMedias.push(() => loadMedia(file));
      strayMedias = strayMedias;
      i++; 
      if (i % 3 === 0) {
        strayMedias = strayMedias;
      }
    }
  });
</script>

<div class="page-container">
  <div class="box">
    <h2>{$_('dialogs.fileBrowser.inUse')}</h2>
    <Gallery columnWidth={220} bind:items={usedMedias} accessable={false}/>
    <h2>{$_('dialogs.fileBrowser.brokenLink')}</h2>
    <Gallery columnWidth={220} bind:items={strayMedias} accessable={false}/>
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
</div>

<style>
  .page-container {
    width: 95svw;
    height: 95svh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .box {
    background-color: #fff;
    width: 800px;
    height: 95%;
    overflow-y: auto;
  }
  .back-button {
    margin-top: 16px;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
</style>