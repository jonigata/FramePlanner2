<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  
  export let comicDir: string = "aiai61555228";
  const pages = [1, 2, 3]; // 表示するページ数
</script>

<div class="page-container">
  <swiper-container navigation="true" pagination="true" centered-slides="true" grab-cursor="true">
    {#each pages as page}
      <!-- svelte-ignore a11y-missing-attribute -->
      <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;">
        <img src={`/comics/${comicDir}/intro${page}.jpg`}/>
      </swiper-slide>
    {/each}
  </swiper-container>
  <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    position : relative;
  }
  img {
    width: 840px;
    height: 1188px;
  }
  .back-button {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
</style>