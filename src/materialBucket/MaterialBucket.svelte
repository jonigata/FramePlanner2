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
  let collectionFolderNode: Node | null = null;
  let editingFolderId: string | null = null;
  let editingFolderName: string = '';

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
      collectionFolderNode = collectionFolders[0];
      const collectionFolder = collectionFolderNode.asFolder()!;
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

  async function addMaterialCollection() {
    if (collectionFolderNode == null || $gadgetFileSystem == null) return;
    const collectionFolder = collectionFolderNode.asFolder()!;
    const newFolder = await $gadgetFileSystem.createFolder();
    const name = `新しいコレクション${materialCollectionFolders.length + 1}`;
    await collectionFolder.link(name, newFolder.id);
    await loadMaterialCollections();
  }

  async function deleteMaterialCollection(bindId: string) {
    if (collectionFolderNode == null || $gadgetFileSystem == null) return;
    const collectionFolder = collectionFolderNode.asFolder()!;
    const entry = await collectionFolder.getEntry(bindId as any);
    if (entry) {
      await collectionFolder.unlink(bindId as any);
      await $gadgetFileSystem.destroyNode(entry[2]);
      delete openStates[entry[1]];
      await loadMaterialCollections();
    }
  }

  async function startEditingFolder(bindId: string, currentName: string) {
    editingFolderId = bindId;
    editingFolderName = currentName;
  }

  async function saveEditingFolder() {
    if (editingFolderId == null || collectionFolderNode == null || !editingFolderName.trim()) return;
    const collectionFolder = collectionFolderNode.asFolder()!;
    await collectionFolder.rename(editingFolderId as any, editingFolderName.trim());
    editingFolderId = null;
    editingFolderName = '';
    await loadMaterialCollections();
  }

  function cancelEditingFolder() {
    editingFolderId = null;
    editingFolderName = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      saveEditingFolder();
    } else if (e.key === 'Escape') {
      cancelEditingFolder();
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
        <div class="collection-header">
          <h3>素材集</h3>
          <button class="btn btn-sm variant-filled-primary" on:click={addMaterialCollection}>
            <span>➕</span> 新しいコレクション
          </button>
        </div>
        <Accordion>
          {#each materialCollectionFolders as folder}
            <AccordionItem bind:open={openStates[folder[1]]}>
              <svelte:fragment slot="summary">
                <div class="folder-header">
                  {#if editingFolderId === folder[0]}
                    <input 
                      type="text" 
                      class="folder-name-input"
                      bind:value={editingFolderName}
                      on:keydown={handleKeydown}
                      on:blur={saveEditingFolder}
                      on:click|stopPropagation
                      autofocus
                    />
                  {:else}
                    <h2 
                      class="folder-name" 
                      on:dblclick|stopPropagation={() => startEditingFolder(folder[0], folder[1])}
                      title="ダブルクリックで編集"
                    >
                      {folder[1]}
                    </h2>
                  {/if}
                  <div class="folder-actions">
                    <button 
                      class="btn btn-sm variant-ghost"
                      on:click|stopPropagation={() => startEditingFolder(folder[0], folder[1])}
                      title="名前を編集"
                    >
                      ✏️
                    </button>
                    <button 
                      class="btn btn-sm variant-ghost-error"
                      on:click|stopPropagation={() => deleteMaterialCollection(folder[0])}
                      title="コレクションを削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
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
    margin: 0;
  }

  h3 {
    font-family: '源暎エムゴ';
    font-size: 1.4rem;
    color: #444;
    margin: 0;
  }

  :global(.accordion-item) {
    background: none;
    border: none;
  }

  .collection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 0 8px;
  }

  .folder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .folder-header button {
    margin-left: auto;
  }

  .folder-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .folder-name {
    cursor: pointer;
    user-select: none;
  }

  .folder-name:hover {
    text-decoration: underline;
    text-decoration-style: dotted;
  }

  .folder-name-input {
    font-family: '源映エムゴ';
    font-size: 1.2rem;
    color: #666;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 2px 8px;
    margin: -2px 0;
    outline: none;
  }

  .folder-name-input:focus {
    border-color: #007bff;
  }
</style>