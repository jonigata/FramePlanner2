<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/frameTree";
  import trashIcon from '../../assets/trash.png';
  import visibleIcon from '../../assets/eye.png';
  import { redrawToken } from '../bookStore';

  export let film: Film;

  const dispatch = createEventDispatcher();

  function onClick(e: MouseEvent) {
    dispatch('select-film', { film, ctrlKey: e.ctrlKey });
  }

  function onDelete(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    dispatch('delete-film', film);
  }

  function onToggleVisible(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    film.visible = !film.visible;
    $redrawToken = true;
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="film"
  class:selected={film?.selected}
  class:unselected={!film?.selected}
  draggable={false}
  on:click={onClick}>
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
    <img draggable={false} class="trash-icon" src={trashIcon} alt="削除" on:click={onDelete}/>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img draggable={false} class="visible-icon" class:off={!film.visible} src={visibleIcon} alt="可視/不可視" on:click={onToggleVisible}/>
    <img draggable={false} class="film-content" src={film.image.src} alt="film"/>
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
    top: 50%;
    right: 4px;
    width: 32px;
    height: 32px;
    transform: translateY(-70%);
    color: white;
  }
  .visible-icon {
    position: absolute;
    left: 4px;
    top: 50%;
    width: 32px;
    height: 32px;
    color: white;
    transform: translateY(-50%);
  }
  .visible-icon.off {
    filter: opacity(0.3);
  }
</style>