<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { getNewReleases, type PublicationContent } from "./firebase";
  import { Router, Route } from "svelte-routing";
  
  import Header from './farm/Header.svelte';
  import Home from './farm/Home.svelte';
  import MyPage from './farm/MyPage.svelte';

  let manga: PublicationContent[] = [];

  onMount(async () => {
    manga = await getNewReleases();
  });
</script>

<Router>
  <main class="flex flex-col min-h-screen bg-gray-100">
    <Header />
    <Route paht="/farm"><Home/></Route>    
    <Route path="/farm/mypage"><MyPage/></Route>
  </main>
</Router>
