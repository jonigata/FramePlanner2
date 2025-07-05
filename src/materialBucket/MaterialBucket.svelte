<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { materialBucketOpen } from './materialBucketStore';
  import MaterialGallery from './MaterialGallery.svelte';
  import WarehouseGallery from './WarehouseGallery.svelte';
  import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
  import { _ } from 'svelte-i18n';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import type { Node, EmbodiedEntry } from '../lib/filesystem/fileSystem';
  import { onMount } from 'svelte';

  let materialCollectionFolders: EmbodiedEntry[] = [];
  let openStates: { [key: string]: boolean } = {};

  function onDragStart() {
    setTimeout(() => {
      $materialBucketOpen = false;
    }, 0);
  }

  let warehouseOpen = false;

  async function loadMaterialCollections() {
    if ($gadgetFileSystem == null) return;
    const root = await $gadgetFileSystem.getRoot();
    const collectionFolders = await root.getNodesByName('素材集');
    if (collectionFolders.length > 0) {
      const collectionFolder = collectionFolders[0].asFolder()!;
      const subfolders = await collectionFolder.listEmbodied();
      materialCollectionFolders = subfolders.filter(entry => entry[2].getType() === 'folder');
      
      // 初回読み込み時に開いた状態を設定
      materialCollectionFolders.forEach((folder, index) => {
        if (openStates[folder[1]] === undefined) {
          openStates[folder[1]] = index === 0; // 最初のフォルダだけ開く
        }
      });
    }
  }

  $: if ($gadgetFileSystem) {
    loadMaterialCollections();
  }
</script>

<div class="drawer-outer">
  <Drawer open={$materialBucketOpen} size="800px" on:clickAway={() => $materialBucketOpen = false}>
    {#if $materialBucketOpen}
      <div class="content-container">
        <Accordion>
          {#each materialCollectionFolders as folder}
            <AccordionItem bind:open={openStates[folder[1]]}>
              <svelte:fragment slot="summary">
                <h2>{folder[1]}</h2>
              </svelte:fragment>
              <svelte:fragment slot="content">
                <div class="accordion-content">
                  <MaterialGallery targetNode={folder[2]} on:dragstart={onDragStart} />
                </div>
              </svelte:fragment>
            </AccordionItem>
          {/each}
          
          <AccordionItem bind:open={warehouseOpen}>
            <svelte:fragment slot="summary">
              <h2>{$_('materialBucket.generationHistory')}</h2>
            </svelte:fragment>
            <svelte:fragment slot="content">
              <div class="accordion-content">
                <WarehouseGallery on:dragstart={onDragStart} />
              </div>
            </svelte:fragment>
          </AccordionItem>
        </Accordion>
      </div>
    {/if}
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .content-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
  }

  :global(.accordion-item) {
    margin-top: -8px;
  }

  .accordion-content {
    height: 400px;
    overflow: hidden;
  }

  h2 {
    font-family: '源暎エムゴ';
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 8px;
  }

  :global(.accordion-item) {
    background: none;
    border: none;
  }
</style>