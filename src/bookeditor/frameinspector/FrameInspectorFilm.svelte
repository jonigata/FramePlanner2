<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/frameTree";
  import trashIcon from '../../assets/trash.png';

  export let film: Film;
  export let index: number;

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

  function onClick(e: MouseEvent) {
    dispatch('select-film', { film, ctrlKey: e.ctrlKey });
  }

  function onDelete() {
    dispatch('delete-film', film);
  }

	async function onDragStart (ev: DragEvent) {
		ev.dataTransfer.setData("index", index.toString());
    ev.stopPropagation();
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
    <div class="vbox">
      <div class="new-film">
        ＋
      </div>
      <div class="new-film-description">
        ここに画像をドロップ
      </div>
    </div>
    {:else}
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img class="trash-icon" src={trashIcon} alt="削除" on:click={onDelete}/>
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
    justify-content: center;
    gap: 8px;
    position: relative;
  }
  .new-film {
    font-size: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 60px;
    color: black;
  }
  .new-film-description {
    color: black;
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
  .trash-icon {
    position: absolute;
    top: 0;
    right: 0;
    width: 32px;
    height: 32px;
    color: white;
  }
</style>