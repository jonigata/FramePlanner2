<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import MangaView from "./mangaview/MangaView.svelte";
  import { Modals } from 'svelte-modals'
  import FullScreenLoading from './utils/FullScreenLoading.svelte';
</script>

<main class="w-full h-full">
  <MangaView/>
</main>

<Modals>
  <div slot="backdrop" class="backdrop"/>
</Modals>
<FullScreenLoading/>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(0,0,0,0.50);
    z-index: 999;
  }
</style>
