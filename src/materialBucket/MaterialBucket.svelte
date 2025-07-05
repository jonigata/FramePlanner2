<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { materialBucketOpen } from './materialBucketStore';
  import MaterialGallery from './MaterialGallery.svelte';
  import WarehouseGallery from './WarehouseGallery.svelte';
  import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
  import { _ } from 'svelte-i18n';

  function onDragStart() {
    setTimeout(() => {
      $materialBucketOpen = false;
    }, 0);
  }

  let warehouseOpen = false;
  let materialOpen = true;
</script>

<div class="drawer-outer">
  <Drawer open={$materialBucketOpen} size="800px" on:clickAway={() => $materialBucketOpen = false}>
    {#if $materialBucketOpen}
      <div class="content-container">
        <Accordion>
          <AccordionItem bind:open={materialOpen}>
            <svelte:fragment slot="summary">
              <h2>{$_('materialBucket.materialCollection')}</h2>
            </svelte:fragment>
            <svelte:fragment slot="content">
              <div class="accordion-content">
                <MaterialGallery on:dragstart={onDragStart} />
              </div>
            </svelte:fragment>
          </AccordionItem>
          
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