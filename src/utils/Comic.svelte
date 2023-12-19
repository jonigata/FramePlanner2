<script lang="ts">
  import comic1 from '../assets/comics/aiai61555228/intro1.jpg';
  import comic2 from '../assets/comics/aiai61555228/intro2.jpg';
  import comic3 from '../assets/comics/aiai61555228/intro3.jpg';
  import { modalStore } from '@skeletonlabs/skeleton';
</script>

<div class="page-container">
  <swiper-container navigation="true" pagination="true" centered-slides="true" grab-cursor="true">
    <!-- svelte-ignore a11y-missing-attribute -->
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><img src={comic1}/></swiper-slide>
    <!-- svelte-ignore a11y-missing-attribute -->
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><img src={comic2}/></swiper-slide>
    <!-- svelte-ignore a11y-missing-attribute -->
    <swiper-slide style="height: 100%;display: flex;align-items: center;justify-content: center;"><img src={comic3}/></swiper-slide>
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