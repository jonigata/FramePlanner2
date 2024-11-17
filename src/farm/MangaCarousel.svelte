<script lang="ts">
  const banners = ['banner1', 'banner2', 'banner3', 'banner4', 'banner5', 'banner6'];
</script>

<div class="page-container">
  <swiper-container navigation="true" pagination="true" centered-slides="true" grab-cursor="true" slides-per-view="auto" space-between="0" loop="true">
    {#each banners as banner}
      <swiper-slide style="width: 512px;height: 256px;">
        <!-- svelte-ignore a11y-missing-attribute -->
        <img src={`./banners/${banner}.png`}/>
      </swiper-slide>
    {/each}
  </swiper-container>
</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    position : relative;
  }
  img {
    width: 512px;
    height: 256px;
  }
</style>
