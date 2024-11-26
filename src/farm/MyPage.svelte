<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { getWorks, updatePublication, type PublicationContent } from "../firebase";
  import MangaList from './MangaList.svelte';
  import EditManga from './EditManga.svelte';

  let manga: PublicationContent[] = [];
  let selectedManga: PublicationContent | null = null;

  function onEdit(e: CustomEvent) {
    selectedManga = e.detail;
  }

  async function onCommit() {
    console.log("Commit", selectedManga);
    const p = selectedManga!;
    await updatePublication(p.id, p.title, p.description, p.is_public);
    selectedManga = null;
    manga = manga;
  }

  onMount(async () => {
    manga = await getWorks(null);
    console.log("Manga", manga);
  });
</script>

<div class="container mx-auto px-4 py-6 w-[800px] flex-grow flex flex-col overflow-hidden">
  <h2 class="text-xl font-bold mb-4">あなたの投稿</h2>

  <div class="flex flex-row gap-4 overflow-hidden h-full">
    <!-- Left Pane -->
    <div class="flex flex-col gap-4 overflow-y-auto w-1/2 h-full">
      <section>
        <div class="flex justify-between items-center mb-4">
          <!-- <button class="text-blue-500 hover:text-blue-600">もっと見る ›</button> -->
        </div>
        <MangaList manga={manga} on:edit={onEdit}/>
      </section>
    </div>

    <!-- Right Pane -->
    <div class="flex flex-col gap-4 w-1/2 p-4 overflow-y-auto">
      {#if selectedManga}
        <EditManga {selectedManga} {onCommit} />
      {/if}
    </div>
  </div>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 1.7rem;
  }
  .input, .textarea {
    border: 1px solid #ccc;
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
  }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }
</style>