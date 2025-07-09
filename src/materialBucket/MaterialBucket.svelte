<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { materialBucketOpen } from './materialBucketStore';
  import MaterialGallery from './MaterialGallery.svelte';
  import WarehouseGallery from './WarehouseGallery.svelte';
  import { Accordion, AccordionItem, SlideToggle } from '@skeletonlabs/skeleton';
  import { _ } from 'svelte-i18n';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import type { Node, EmbodiedEntry } from '../lib/filesystem/fileSystem';
  import { waitDialog } from '../utils/waitDialog';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { MaterialBucket_closeOnDragStore } from './tweakUiStore';
  
  import trashIcon from '../assets/fileManager/trash.webp';
  import renameIcon from '../assets/fileManager/rename.webp';
  import newFolderIcon from '../assets/fileManager/new-folder.webp';

  let materialCollectionFolders: EmbodiedEntry[] = [];
  let openStates: { [key: string]: boolean } = {};
  let collectionFolderNode: Node | null = null;
  let editingFolderId: string | null = null;
  let editingFolderName: string = '';

  function onDragStart() {
    if ($MaterialBucket_closeOnDragStore) {
      setTimeout(() => {
        $materialBucketOpen = false;
      }, 0);
    }
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
      // 削除確認ダイアログを表示
      const confirmed = await waitDialog<boolean>('confirm', {
        title: 'コレクションの削除',
        message: `「${entry[1]}」を削除しますか？\n\nこのコレクション内のすべてのファイルが削除されます。\nこの操作は元に戻すことができません。`,
        positiveButtonText: '削除',
        negativeButtonText: 'キャンセル'
      });
      
      if (confirmed) {
        await collectionFolder.unlink(bindId as any);
        await $gadgetFileSystem.destroyNode(entry[2]);
        delete openStates[entry[1]];
        await loadMaterialCollections();
      }
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
  <Drawer 
    open={$materialBucketOpen} 
    size="800px" 
    on:clickAway={() => $materialBucketOpen = false} 
    overlay={$MaterialBucket_closeOnDragStore}
  >
    {#if $materialBucketOpen}
      <div class="content-container">
        <div class="collection-header">
          <h3>素材集</h3>
          <div class="header-controls">
            <div use:toolTip={$_('materialBucket.closeOnDrag')}>
              <SlideToggle
                name="closeOnDrag"
                bind:checked={$MaterialBucket_closeOnDragStore}
                size="sm"
              />
            </div>
            <button 
              class="btn btn-sm variant-filled-primary collection-add-button" 
              on:click={addMaterialCollection}
              use:toolTip={'新しいコレクションを作成'}
            >
              <img src={newFolderIcon} alt="new collection" class="button-icon" />
              新しいコレクション
            </button>
          </div>
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
                      class="icon-button"
                      on:click|stopPropagation={() => startEditingFolder(folder[0], folder[1])}
                      use:toolTip={'名前を編集'}
                    >
                      <img src={renameIcon} alt="rename" class="icon" />
                    </button>
                    <button 
                      class="icon-button"
                      on:click|stopPropagation={() => deleteMaterialCollection(folder[0])}
                      use:toolTip={'コレクションを削除'}
                    >
                      <img src={trashIcon} alt="trash" class="icon" />
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
    min-height: 200px;
    overflow: visible;
    display: flex;
    flex-direction: column;
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

  .icon-button {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .icon {
    width: 16px;
    height: 16px;
    display: block;
  }

  .collection-add-button {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: '源映エムゴ';
    font-size: 14px;
  }

  .button-icon {
    width: 16px;
    height: 16px;
    display: block;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-controls :global(.slide-toggle) {
    margin: 0;
  }

  .header-controls :global(.slide-toggle label) {
    font-family: '源映エムゴ';
    font-size: 14px;
    color: #666;
  }
</style>