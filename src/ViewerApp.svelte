<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import { onMount } from "svelte";
  import { getPublication, type PublicationContent } from './firebase';
  import { bootstrap } from './utils/accountStore';

  import MangaView from "./mangaview/MangaView.svelte";
  import { Modals } from 'svelte-modals'
  import FullScreenLoading from './utils/FullScreenLoading.svelte';
  import PublicationInfo from './mangaview/PublicationInfo.svelte';
  import AccountPanel from './farm/AccountPanel.svelte';
  import { readEnvelope, listFonts, isLocalFont, localFonts, loadGoogleFontForCanvas, type Book } from "manga-renderer";
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  let publication: PublicationContent | null = null;
  let book: Book | null = null;
  let bookLoading = false;

  async function loadEnvelope(contentUrl: string) {
    try {
      const response = await fetch(contentUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch manga.envelope');
      }
      const fileContent = await response.blob();
      const book = await readEnvelope(fileContent);
      return book;
    } catch (error) {
      console.error('Error loading file:', error);
    }
  }

  onMount(async () => {
    bootstrap();

    bookLoading = true;
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
    console.log("Publication", publication);
    book = (await loadEnvelope(publication.content_url))!;

    const fonts = listFonts(book);
    console.log(fonts);
    try {
      for (const font of fonts) {
        console.log(font);
        const {family, weight} = font

        if (isLocalFont(family)) {
          const localFile = localFonts[family];
          const url = new URL(`./assets/fonts/${localFile}.woff2`, import.meta.url);
          const font = new FontFace(family, `url(${url.href}) format('woff2')`, { style: 'normal', weight });
          document.fonts.add(font);
          await font.load();
        } else {
          console.log("loading google font", family, weight);
          await loadGoogleFontForCanvas(family, [weight]);
        }
      }
    }
    catch (error) {
      console.error("Error loading font", error);
    }
    bookLoading = false;

  });
</script>

<!-- 左右 -->
<div class="flex w-full h-full">
<aside class="w-1/4 h-full flex flex-col overflow-y-auto overflow-x-hidden min-w-[380px] max-w-[380px]">
  {#if publication != null}
    <PublicationInfo publication={publication}/>
  {/if}
  <div class="flex-grow"/>
  <div class="account-panel">
    <AccountPanel/>
  </div>
</aside>
<main class="w-full h-full relative">
  {#if book != null}
    <MangaView book={book}/>
  {/if}
  {#if bookLoading}
    <div class="absolute inset-0 flex items-center justify-center bg-black/50">
      <ProgressRadial width="w-48"/>
    </div>
  {/if}
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
  .account-panel {
    background-color: #b9cdf0;
    padding: 8px;
  }
</style>
