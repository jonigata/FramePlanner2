<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/frameTree";

  export let film: Film;

  const dispatch = createEventDispatcher();

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const dt = ev.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log(file.type)
      if (file.type.startsWith("image/")) {
        const imageURL = URL.createObjectURL(file);
        dispatch('new-film', imageURL);
      }
    }
  }

  function onClick() {
    film.selected = !film.selected;
    film = film;
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="film"
  class:selected={film?.selected}
  class:unselected={!film?.selected}
  on:click={onClick}
  on:dragover={onDragOver}
  on:drop={onDrop}>
  {#if !film}
    <div class="new-film">
      ＋
    </div>
  {:else}
    <img class="film-content" src={film.image.src} alt="film"/>
  {/if}
</div>

<style lang="postcss">
  .film {
    width: 100%;
    height: 100px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .new-film {
    font-size: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100px;
  }
  .film-content {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .selected {
    @apply variant-filled-primary;
  }
  .unselected {
    @apply variant-soft-tertiary;
  }

</style>