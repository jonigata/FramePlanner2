<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { getNewReleases, type PublicationContent } from "../firebase";
  import MangaGrid from './MangaGrid.svelte';

  let manga: PublicationContent[] = [];

  onMount(async () => {
    manga = await getNewReleases();
    console.log(manga);
  });
</script>


<div class="container mx-auto px-4 py-6 w-[800px]">
  <section>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">最近の投稿</h2>
      <!-- <button class="text-blue-500 hover:text-blue-600">もっと見る ›</button> -->
    </div>
    <MangaGrid manga={manga}/>
  </section>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 1.7rem;
  }
</style>