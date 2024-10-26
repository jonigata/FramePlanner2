<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { browserStrayImages, browserUsedImages } from './fileBrowserStore';
	import Gallery from '../generator/Gallery.svelte';
</script>

<div class="page-container">
  <div class="box">
    <h2>使用中</h2>
    <Gallery columnWidth={220} bind:canvases={$browserUsedImages} accessable={false}/>
    <h2>リンク切れ</h2>
    <Gallery columnWidth={220} bind:canvases={$browserStrayImages} accessable={false}/>
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