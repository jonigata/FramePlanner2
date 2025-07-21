<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { frameInspectorTarget, frameInspectorRebuildToken } from './frameInspectorStore';
  import { insertFrameLayers } from "../../lib/layeredCanvas/dataModels/frameTree";
  import { type Film } from "../../lib/layeredCanvas/dataModels/film";
  import FilmList from "./FilmList.svelte";
  import { dominantMode } from "../../uiStore";
  import Drawer from "../../utils/Drawer.svelte";
  import { bookOperators } from "../workspaceStore";
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { calculateFramePadding } from '../../utils/outPaintFilm'
  import type { FilmTool } from '../../utils/filmTools';
  import { _ } from 'svelte-i18n';
  import { calculateOutPaintingCost as calcOutPaintCost, calculateInPaintingCost as calcInPaintCost } from '../../utils/edgeFunctions/calculateCost';

  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;

  const visibility = writableDerived(
  	frameInspectorTarget,
  	(fit) => fit?.frame.visibility,
  	(v, fit) => {
      fit!.frame.visibility = v!;
      $bookOperators!.commit(null);
      return fit;
    }
  );

  $: opened = $dominantMode != "painting" && $frameInspectorTarget?.frame != null
  $: filmStack = $frameInspectorTarget?.frame.filmStack!;

  function onCommit(e: CustomEvent<boolean>) {
    console.log("FrameInspector", e.detail);
    $bookOperators!.commit(e.detail ? null : "effect");
  }

  function onGenerate(e: CustomEvent<Film>) {
    $frameInspectorTarget!.commandTargetFilm = e.detail;
    $frameInspectorTarget!.command = "generate";
  }

  function onAccept(e: CustomEvent<{index: number, films: Film[]}>) {
    const {index, films} = e.detail;
    console.log("FrameInspector.onAccept", index, films);
    const page = $frameInspectorTarget!.page;
    const element = $frameInspectorTarget!.frame;
    const paperSize = page.paperSize;
    insertFrameLayers(page.frameTree, paperSize, element, index, films);

    filmStack = filmStack;
    $bookOperators!.commit(null);
  }

  function onTool(e: CustomEvent<{tool:FilmTool, film:Film}>) {
    const { tool, film } = e.detail;
    switch(tool) {
      case "punch":
        onPunch(film);
        break;
      case "video":
        onVideo(film);
        break;
      case "upscale":
        onUpscale(film);
        break;
      case "duplicate":
        onDuplicate(film);
        break;
      case "outpaint":
        onOutPaint(film);
        break;
      case "eraser":
        onEraser(film);
        break;
      case "inpaint":
        onInpaint(film);
        break;
      case "textedit":
        onTextEdit(film);
        break;
    }
  }

  function onPunch(film: Film) {
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "punch";
  }

  function onVideo(film: Film) {
    console.log("FrameInspector.onVideo",)
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "video";
  }

  function onUpscale(film: Film) {
    console.log("FrameInspector.onUpscale")
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "upscale";
  }

  function onDuplicate(film: Film) {
    console.log("FrameInspector.onDuplicate", film);
    const index = filmStack.films.indexOf(film);
    const page = $frameInspectorTarget!.page;
    const element = $frameInspectorTarget!.frame;
    const paperSize = page.paperSize;
    const newFilm = film.clone();
    insertFrameLayers(page.frameTree, paperSize, element, index, [newFilm]);
    filmStack = filmStack;
    $bookOperators!.commit(null);
  }

  function onOutPaint(film: Film) {
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "outpaint";
  }

  function onEraser(film: Film) {
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "eraser";
  }

  function onInpaint(film: Film) {
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "inpaint";
  }

  function onTextEdit(film: Film) {
    $frameInspectorTarget!.commandTargetFilm = film;
    $frameInspectorTarget!.command = "textedit";
  }

  function calculateOutPaintingCost(film: Film) {
    const fit = $frameInspectorTarget!;
    const padding = calculateFramePadding(fit.page, fit.frame, film);
    
    const size = {
      width: film.media.naturalWidth,
      height: film.media.naturalHeight
    };
    
    return calcOutPaintCost(size, padding);
  }

  function calculateInPaintingCost(film: Film) {
    const size = {
      width: film.media.naturalWidth,
      height: film.media.naturalHeight
    };
    
    return calcInPaintCost(size);
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight/>

<div class="drawer-outer">
  <Drawer placement={"left"} open={opened} overlay={false} size={"350px"} on:clickAway={close}>
    <div class="drawer-content">
      <div class="h-full flex items-center justify-center gap-4 mb-4">
        <h2>{$_('frame.visibility')}</h2>
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={$visibility} name="embed" value={0}>{$_('frame.hidden')}</RadioItem>
          <RadioItem bind:group={$visibility} name="embed" value={1}>{$_('frame.frameOnly')}</RadioItem>
          <RadioItem bind:group={$visibility} name="embed" value={2}>{$_('frame.all')}</RadioItem>
        </RadioGroup>
      </div>
      {#key $frameInspectorRebuildToken}
        <FilmList 
          showsBarrier={true}  
          filmStack={filmStack}
          on:commit={onCommit}
          on:generate={onGenerate} 
          on:accept={onAccept}
          on:tool={onTool}
          calculateOutPaintingCost={calculateOutPaintingCost}
          calculateInPaintingCost={calculateInPaintingCost}/>
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
