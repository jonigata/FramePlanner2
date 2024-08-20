<script lang="ts">
  import { onMount } from 'svelte';
  import Drawer from '../utils/Drawer.svelte'
  import { notebookOpen } from './notebookStore';
  import NotebookManual from './NotebookManual.svelte';
  import NotebookAutomatic from './NotebookAutomatic.svelte';
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  import { bookEditor, mainBook } from '../bookeditor/bookStore'

  $: notebook = $mainBook ? $mainBook.notebook : null;

  let tabSet: number = 0;

  function close() {
    if (JSON.stringify(notebook) !== oldNotebook) {
      $bookEditor.commit(null);
    }
    $notebookOpen = false;
  }

  let oldNotebook: string = null;
  onMount(async () => {
    oldNotebook = JSON.stringify(notebook);
  });

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$notebookOpen} size="720px" on:clickAway={close}>
    <TabGroup>
      <Tab bind:group={tabSet} name="tab3" value={0}><span class="tab">オート</Tab>
      <Tab bind:group={tabSet} name="tab3" value={1}><span class="tab">マニュアル</Tab>
      <!-- Tab Panels --->
      <svelte:fragment slot="panel">
        {#if tabSet === 0}
          <NotebookAutomatic/>
        {:else}
          <NotebookManual/>
        {/if}
      </svelte:fragment>
    </TabGroup>  
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
  }
</style>