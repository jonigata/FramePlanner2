<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { browserStrayImages, browserUsedImages } from './fileBrowserStore';
</script>

<div class="page-container">
  <div class="box">
    <h2>使用中</h2>
    <div class="images">
      {#each $browserUsedImages as image}
        <img width="128" height="128" src={image.src} alt={""}/>
      {/each}
    </div>  
    <h2>リンク切れ</h2>
    <div class="images">
      {#each $browserStrayImages as image}
        <img width="128" height="128" src={image.src} alt={""}/>
      {/each}
    </div>  
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
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
  .images {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-start;
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