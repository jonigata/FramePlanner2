<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { draggable } from '@neodrag/svelte';
  import { type FrameInspectorPosition, frameInspectorTarget, frameInspectorPosition } from './frameInspectorStore';
  import FrameInspectorFilm from "./FrameInspectorFilm.svelte";
  import { Film } from "../../lib/layeredCanvas/dataModels/frameTree";
  import { redrawToken } from "../bookStore"

  let adjustedPosition = { x: window.innerWidth - 350 - 16, y: 16 };
  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;
  let inspector = null;

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

  function onNewFilm(e: CustomEvent<string>) {
    const image = new Image();
    image.src = e.detail;

    const film = new Film();
    film.image = image;
    film.n_scale = 1;
    film.n_translation = [0, 0];
    film.rotation = 0;
    film.reverse = [1, 1];
    $frame.filmStack.films.push(film);
    $redrawToken = true;
  }

</script>

<svelte:window bind:innerWidth bind:innerHeight/>

{#if $frame}
<div class="frame-inspector-container">
  <div class="frame-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}} bind:this={inspector}>    
    <div class="title-bar variant-filled-surface rounded-container-token">
      コマ
    </div>
    <div class="film-stack vbox gap">
      <FrameInspectorFilm film={null} on:new-film={onNewFilm}/>
      {#each $frame.filmStack.films.toReversed() as film}
        <FrameInspectorFilm film={film}/>
      {/each}
    </div>
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
