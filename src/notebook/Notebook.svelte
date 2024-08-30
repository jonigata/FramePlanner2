<script lang="ts">
  import { onMount } from 'svelte';
  import Drawer from '../utils/Drawer.svelte'
  import { notebookOpen } from './notebookStore';
  import NotebookManual from './NotebookManual.svelte';
  import { bookEditor, mainBook } from '../bookeditor/bookStore'

  $: notebook = $mainBook ? $mainBook.notebook : null;

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
    <NotebookManual/>
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>