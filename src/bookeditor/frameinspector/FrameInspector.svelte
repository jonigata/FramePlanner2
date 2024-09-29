<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { frameInspectorTarget, frameInspectorRebuildToken } from './frameInspectorStore';
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import FilmList from "./FilmList.svelte";
  import { dominantMode } from "../../uiStore";
  import Drawer from "../../utils/Drawer.svelte";
  import { bookEditor } from "../bookStore";

  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;

  const frame = writableDerived(
    frameInspectorTarget,
    (fit) => {
      console.log("FrameInspectorTarget changed");
      return fit?.frame;
    },
    (f, fit) => {
      fit.frame = f;
      return fit;
    }
  );

  $: opened = $dominantMode != "painting" && $frame != null

  function onCommit(e: CustomEvent<boolean>) {
    console.log("FrameInspector", e.detail);
    $bookEditor.commit(e.detail ? null : "effect");
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

<div class="drawer-outer">
  <Drawer placement={"left"} open={opened} overlay={false} size="350px" on:clickAway={close}>
    <div class="drawer-content">
      {#key $frameInspectorRebuildToken}
        <FilmList filmStack={$frame.filmStack} on:commit={onCommit} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
      {/key}
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 350px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>
