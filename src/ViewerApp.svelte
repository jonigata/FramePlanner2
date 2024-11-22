<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import { onMount } from "svelte";
  import { getPublication, type PublicationContent } from './firebase';

  import MangaView from "./mangaview/MangaView.svelte";
  import { Modals } from 'svelte-modals'
  import FullScreenLoading from './utils/FullScreenLoading.svelte';
  import PublicationInfo from './mangaview/PublicationInfo.svelte';

  let publication: PublicationContent;

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLParams", urlParams);
    let envelope = urlParams.get('envelope');
    if (envelope === null) {
      const envelope2 = window.location.pathname.split('/').pop();
      if (!envelope2) {
        console.error("envelope not found");
        return;
      }
      envelope = envelope2;
    }

    publication = await getPublication(envelope);
  });
</script>

<!-- 左右 -->
<div class="flex w-full h-full">
<aside class="w-1/4 h-full">
  {#if publication}
    <PublicationInfo publication={publication}/>
  {/if}
</aside>
<main class="w-full h-full">
  <MangaView/>
</main>
</div>

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
  aside {
    padding: 16px;
    border-right: 1px solid #ddd;
  }
</style>
