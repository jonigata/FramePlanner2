<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { draggable } from '@neodrag/svelte';
  import { frameInspectorTarget } from './frameInspectorStore';
  import FrameInspectorFilm from "./FrameInspectorFilm.svelte";
  import { Film } from "../../lib/layeredCanvas/dataModels/frameTree";
  import { redrawToken } from "../bookStore"
  import ListBox from "../../utils/listbox/ListBox.svelte";
  import ListBoxItem from "../../utils/listbox/ListBoxItem.svelte";

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

  async function onNewFilm(e: CustomEvent<{ index: number, files: FileList }>) {
    let { index, files } = e.detail;
    const file = files[0];
    if (file.type.startsWith("image/")) {
      const imageURL = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageURL;
      await image.decode();

      if (0 < index) {
        index--;
      }
      index = $frame.filmStack.films.length - index;

      const film = new Film();
      film.image = image;
      film.n_scale = 1;
      film.n_translation = [0, 0];
      film.rotation = 0;
      film.reverse = [1, 1];
      $frame.filmStack.films.splice(index, 0, film);
      $frameInspectorTarget.command = "commit";
      key++;
    }
  }

  async function onMoveFilm(e: CustomEvent<{ index: number, sourceIndex: number }>) {
    console.log(e.detail);
    let { index, sourceIndex } = e.detail;

    if (index < sourceIndex) {
      sourceIndex = $frame.filmStack.films.length - sourceIndex;
      index = $frame.filmStack.films.length - index;
      
      const film = $frame.filmStack.films.splice(sourceIndex, 1)[0];
      $frame.filmStack.films.splice(index, 0, film);
    } else {
      sourceIndex = $frame.filmStack.films.length - sourceIndex;
      index = $frame.filmStack.films.length - index;
      
      const film = $frame.filmStack.films.splice(sourceIndex, 1)[0];
      $frame.filmStack.films.splice(index + 1, 0, film);
    }
    $frameInspectorTarget.command = "commit";
    key++;
  }

  function onSelectFilm(e: CustomEvent<{ film: Film, ctrlKey: boolean, metaKey: boolean }>) {
    const { film, ctrlKey, metaKey } = e.detail;

    if (!ctrlKey && !metaKey) {
      const oldSelected = film.selected;
      $frame.filmStack.films.forEach(f => f.selected = false);
      film.selected = !oldSelected;
    } else {
      film.selected = !film.selected;
    }
    key++;
  }

  function onDeleteFilm(e: CustomEvent<Film>) {
    const film = e.detail;
    $frame.filmStack.films = $frame.filmStack.films.filter(f => f !== film);
    $redrawToken = true;
    $frameInspectorTarget.command = "commit";
    key++;
  }

  function onScribble(e: CustomEvent<Film>) {
    console.log("onScribble", e.detail);
    $frameInspectorTarget.commandTargetFilm = e.detail;
    $frameInspectorTarget.command = "scribble";
  }

  function onGenerate(e: CustomEvent<Film>) {
    console.log("onGenerate", e.detail);
    $frameInspectorTarget.commandTargetFilm = e.detail;
    $frameInspectorTarget.command = "generate";
  }

  function onPunch(e: CustomEvent<Film>) {
    console.log("onPunch", e.detail);
    $frameInspectorTarget.commandTargetFilm = e.detail;
    $frameInspectorTarget.command = "punch";
  }

</script>

<svelte:window bind:innerWidth bind:innerHeight/>

{#if $frame}
<div class="frame-inspector-container">
  <div class="frame-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}} bind:this={inspector}>    
    <div class="title-bar variant-filled-surface rounded-container-token">
      コマ
    </div>
    {#key key}
      <ListBox on:import={onNewFilm} on:move={onMoveFilm}>
        <ListBoxItem draggable={false} transferTo={1}>
          <FrameInspectorFilm film={null} on:select={onGenerate}/>
        </ListBoxItem>
        {#each $frame.filmStack.films.toReversed() as film}
          <ListBoxItem>
            <FrameInspectorFilm film={film} on:select={onSelectFilm} on:delete={onDeleteFilm} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
          </ListBoxItem>
        {/each}
      </ListBox>
    {/key}
  </div>
</div>
{/if}

<style>
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
  .frame-inspector :global(.listbox) {
    gap: 16px;
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
</style>
