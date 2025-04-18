<script lang="ts">
  import { onMount } from 'svelte';
  import { modalStore } from '@skeletonlabs/skeleton';
  import { serializeBook } from '../filemanager/fileManagerStore';
  import { mainBook } from '../bookeditor/workspaceStore';

  let json = '';

  onMount(async () => {
    json = JSON.stringify(serializeBook($mainBook!), null, 2);
  });
</script>

<div class="page-container">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
  <div class="box">
    <div class="verbatim">
      {json}
    </div>
  </div>

</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .box {
    background-color: #fff;
    width: 800px;
    height: 95%;
    overflow-y: auto;
  }
  .verbatim {
    white-space: pre;
    text-align: left;
    padding: 16px;
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