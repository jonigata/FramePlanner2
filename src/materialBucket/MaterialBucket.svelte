<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { materialBucketOpen } from './materialBucketStore';
  import MaterialGallery from './MaterialGallery.svelte';
  import WarehouseGallery from './WarehouseGallery.svelte';
  import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';

  function onDragStart() {
    setTimeout(() => {
      $materialBucketOpen = false;
    }, 0);
  }

  let warehouseOpen = false;
</script>

<div class="drawer-outer">
  <Drawer open={$materialBucketOpen} size="800px" on:clickAway={() => $materialBucketOpen = false}>
    {#if $materialBucketOpen}
      <div class="content-container">
        <div class="material-section">
          <h2>素材集</h2>
          <MaterialGallery on:dragstart={onDragStart} />
        </div>
        
        <Accordion>
          <AccordionItem bind:open={warehouseOpen}>
            <svelte:fragment slot="summary">
              <h2>生成履歴</h2>
            </svelte:fragment>
            <svelte:fragment slot="content">
              <WarehouseGallery on:dragstart={onDragStart} />
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
    gap: 24px;
    padding: 16px;
  }

  :global(.accordion-item) {
    margin-top: -8px;
  }

  .material-section {
    flex: 1;
    min-height: 0;
    max-height: calc(100% - 60px); /* アコーディオンの高さ分を引く */
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