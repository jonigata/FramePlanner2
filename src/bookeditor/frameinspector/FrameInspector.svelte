<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { draggable } from '@neodrag/svelte';
  import { type FrameInspectorPosition, frameInspectorTarget, frameInspectorPosition } from './frameInspectorStore';
  import FrameInspectorFilm from "./FrameInspectorFilm.svelte";
  import { Film } from "../../lib/layeredCanvas/dataModels/frameTree";
  import { redrawToken } from "../bookStore"
  import ListBox from "../../utils/listbox/ListBox.svelte";
  import ListBoxItem from "../../utils/listbox/ListBox.svelte";

  let adjustedPosition = { x: window.innerWidth - 350 - 16, y: 16 };
  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;
  let inspector = null;
  let key = 0;

  const frame = writableDerived(
    frameInspectorTarget,
    (fit) => fit?.frame,
    (f, fit) => {
      fit.frame = f;
      return fit;
    }
  );
  const framePage = writableDerived(
    frameInspectorTarget,
    (fit) => fit?.page,
    (f, fit) => {
      fit.page = f;
      return fit;
    }
  );

  function onDrag({offsetX, offsetY}) {
    adjustedPosition = {x: offsetX, y: offsetY};
  }

  async function onNewFilm(e: CustomEvent<string>) {
    const image = new Image();
    image.src = e.detail;
    await image.decode();

    const film = new Film();
    film.image = image;
    film.n_scale = 1;
    film.n_translation = [0, 0];
    film.rotation = 0;
    film.reverse = [1, 1];
    $frame.filmStack.films.push(film);
    $redrawToken = true;
    key++;
  }

  function onSelectFilm(e: CustomEvent<{ film: Film, ctrlKey: boolean }>) {
    const { film, ctrlKey } = e.detail;

    if (!ctrlKey) {
      $frame.filmStack.films.forEach(f => f.selected = false);
      film.selected = true;
    } else {
      film.selected = !film.selected;
    }
    key++;
  }

  function onDeleteFilm(e: CustomEvent<Film>) {
    const film = e.detail;
    $frame.filmStack.films = $frame.filmStack.films.filter(f => f !== film);
    $redrawToken = true;
    key++;
  }

</script>

<svelte:window bind:innerWidth bind:innerHeight/>

{#if $frame}
<div class="frame-inspector-container">
  <div class="frame-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}} bind:this={inspector}>    
    <div class="title-bar variant-filled-surface rounded-container-token">
      コマ
    </div>
    <ListBox>
      <ListBoxItem>
        <FrameInspectorFilm film={null} index={-1} on:new-film={onNewFilm}/>
      </ListBoxItem>
      {#key key}
        {#each $frame.filmStack.films.toReversed() as film, i}
          <ListBoxItem>
            <FrameInspectorFilm film={film} index={i} on:select-film={onSelectFilm} on:delete-film={onDeleteFilm}/>
          </ListBoxItem>
        {/each}
      {/key}
    </ListBox>
    </div>
</div>
{/if}

<style>
  .frame-inspector-container {
    position: absolute;
    top: 0;
    left: 0;
  }
  .frame-inspector {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 350px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
  }
  .title-bar {
    cursor: move;
    align-self: stretch;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  .film-stack {
    overflow-y: auto;
    width: 100%;
    height: 400px;
  }
</style>
