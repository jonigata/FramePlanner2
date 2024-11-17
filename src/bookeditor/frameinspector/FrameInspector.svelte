<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { frameInspectorTarget, frameInspectorRebuildToken } from './frameInspectorStore';
  import { insertFilms } from "../../lib/layeredCanvas/dataModels/frameTree";
  import { type Film } from "../../lib/layeredCanvas/dataModels/film";
  import FilmList from "./FilmList.svelte";
  import { dominantMode } from "../../uiStore";
  import Drawer from "../../utils/Drawer.svelte";
  import { bookEditor } from "../bookStore";
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';

  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;

  const visibility = writableDerived(
  	frameInspectorTarget,
  	(fit) => fit?.frame.visibility,
  	(v, fit) => {
      fit!.frame.visibility = v!;
      $bookEditor!.commit(null);
      return fit;
    }
  );

  $: opened = $dominantMode != "painting" && $frameInspectorTarget?.frame != null
  $: filmStack = $frameInspectorTarget?.frame.filmStack!;

  function onCommit(e: CustomEvent<boolean>) {
    console.log("FrameInspector", e.detail);
    $bookEditor!.commit(e.detail ? null : "effect");
  }

  function onScribble(e: CustomEvent<Film>) {
    $frameInspectorTarget!.commandTargetFilm = e.detail;
    $frameInspectorTarget!.command = "scribble";
  }

  function onGenerate(e: CustomEvent<Film>) {
    $frameInspectorTarget!.commandTargetFilm = e.detail;
    $frameInspectorTarget!.command = "generate";
  }

  function onPunch(e: CustomEvent<Film>) {
    $frameInspectorTarget!.commandTargetFilm = e.detail;
    $frameInspectorTarget!.command = "punch";
  }

  function onAccept(e: CustomEvent<{index: number, films: Film[]}>) {
    const {index, films} = e.detail;
    const page = $frameInspectorTarget!.page;
    const element = $frameInspectorTarget!.frame;
    const paperSize = page.paperSize;
    insertFilms(page.frameTree, paperSize, element, index, films);

    filmStack = filmStack;
    $bookEditor!.commit(null);
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight/>

<div class="drawer-outer">
  <Drawer placement={"left"} open={opened} overlay={false} size={"350px"} on:clickAway={close}>
    <div class="drawer-content">
      <div class="h-full flex items-center justify-center gap-4 mb-4">
        <h2>表示</h2>
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={$visibility} name="embed" value={0}>非表示</RadioItem>
          <RadioItem bind:group={$visibility} name="embed" value={1}>枠なし</RadioItem>
          <RadioItem bind:group={$visibility} name="embed" value={2}>すべて</RadioItem>
        </RadioGroup>
      </div>
      {#key $frameInspectorRebuildToken}
        <FilmList filmStack={filmStack} 
          on:commit={onCommit}
          on:scribble={onScribble} 
          on:generate={onGenerate} 
          on:punch={onPunch} 
          on:accept={onAccept}/>
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
  h2 {
    font-family: '源暎エムゴ';
    font-size: 16px;
    line-height: normal;
  }
</style>
