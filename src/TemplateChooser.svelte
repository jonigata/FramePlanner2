<script>
  import { register } from 'swiper/element/bundle';
  import Paper from './Paper.svelte';

  register();
</script>

<div class="template-selector">
  <swiper-container navigation="true" pagination="true">
    <swiper-slide><div class="hbox"><Paper/></div></swiper-slide>
    <swiper-slide><div class="hbox"><Paper/></div></swiper-slide>
    <swiper-slide><div class="hbox"><Paper/></div></swiper-slide>
  </swiper-container>  
</div>

<style>
  .template-selector {
    background-color: #98bedd;
    height: 200px;
  }

</style>