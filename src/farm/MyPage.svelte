<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  import { onMount } from "svelte";
  import { getNewReleases, type PublicationContent } from "../firebase";
  import MangaList from './MangaList.svelte';

  let manga: PublicationContent[] = [];
  let selectedManga: PublicationContent | null = null;

  function onEdit(e: CustomEvent) {
    selectedManga = e.detail;
  }

  function onCommit() {
    console.log("Commit", selectedManga);
    selectedManga = null;
  }

  onMount(async () => {
    manga = await getNewReleases();
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
        <h2 class="text-lg font-bold">編集: {selectedManga.title}</h2>
        <img
          src={selectedManga.thumbnail_url}
          alt={selectedManga.title}
          class="w-48 h-64 object-cover rounded-lg shadow-md"
        />
        <div class="flex flex-col">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="text-xs text-gray-600">タイトル</label>
          <input type="text" class="input" bind:value={selectedManga.title} />
        </div>
        <div class="flex flex-col">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="text-xs text-gray-600">説明</label>
          <textarea class="textarea" bind:value={selectedManga.description}></textarea>
        </div>
        <button type="button" class="btn btn-primary mt-4" on:click={onCommit}>保存</button>
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
  .btn-primary {
    background-color: #007bff;
    color: white;
  }
</style>