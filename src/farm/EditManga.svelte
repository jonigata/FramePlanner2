<script lang="ts">
  export let selectedManga;
  export let onCommit;
</script>

<h2 class="text-lg font-bold">{selectedManga.title}</h2>
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
<div class="flex flex-col">
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label class="text-xs text-gray-600">関連URL</label>
  <input type="text" class="input" bind:value={selectedManga.related_url} />
</div>
<div class="flex items-center">
  <input type="checkbox" id="is_public" bind:checked={selectedManga.is_public} class="mr-2" />
  <label for="is_public" class="text text-gray-600">公開する</label>
</div>
<button type="button" class="btn btn-primary mt-4" on:click={onCommit}>保存</button>

<style>
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