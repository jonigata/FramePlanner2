<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { getWorks, type PublicationContent, type Mail } from "../firebase";
  import MyPage from './MyPage.svelte';
  import OthersPage from './OthersPage.svelte';

  export let username: string | null = null;

  let isMine = false;
  let manga: PublicationContent[] = [];

  onMount(async () => {
    console.log("UserPage username", username);
    const works = await getWorks(username);
    manga = works.works;
    isMine = works.isMine;
    console.log("Manga", manga);
  });
</script>

<div class="container mx-auto px-4 py-6 w-[800px] flex-grow flex flex-col overflow-hidden">
  {#if isMine}
    <MyPage username={username} manga={manga}/>
  {:else}
    <OthersPage username={username} manga={manga}/>
  {/if}
</div>
