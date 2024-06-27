<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { draggable } from '@neodrag/svelte';
  import { frameInspectorTarget } from './frameInspectorStore';
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import { redrawToken } from "../bookStore"
  import FilmList from "./FilmList.svelte";

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

  function onDrag({offsetX, offsetY}) {
    adjustedPosition = {x: offsetX, y: offsetY};
  }

  function onCommit() {
    $frameInspectorTarget.command = "commit";
    $redrawToken = true;
  }

  function onScribble(e: CustomEvent<Film>) {
    $frameInspectorTarget.commandTargetFilm = e.detail;
    $frameInspectorTarget.command = "scribble";
  }

  function onGenerate(e: CustomEvent<Film>) {
    $frameInspectorTarget.commandTargetFilm = e.detail;
    $frameInspectorTarget.command = "generate";
  }

  function onPunch(e: CustomEvent<Film>) {
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
    <FilmList filmStack={$frame.filmStack} on:commit={onCommit} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
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
