<script lang="ts">
  import type { FrameElement, Film } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Page } from '../bookeditor/book';
  import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import { InlinePainterLayer } from '../lib/layeredCanvas/layers/inlinePainterLayer';
  import { mainBook } from '../bookeditor/bookStore';
  import PainterToolBox from './PainterToolBox.svelte';
  import PainterAutoGenerate from './PainterAutoGenerate.svelte';

  // TODO: autoGenerate周り未整備、基本的に一旦削除予定

  export let layeredCanvas: LayeredCanvas;
  export let arrayLayer: ArrayLayer;
  let painterPage: Page = null;
  let painterElement: FrameElement = null;
  let painterFilm: Film = null;
  let autoGeneration: boolean = false;
  let lcm: boolean = false;
  let painterAutoGenerate: PainterAutoGenerate = null;
  let url: string = "http://192.168.68.111:7860";
  let onDoneHandler: () => void;

  $: onChangeAutoGeneration(autoGeneration);
  function onChangeAutoGeneration(autoGeneration: boolean) {
    if (layeredCanvas == null) { return; }
    console.log("onChangeAutoGeneration", autoGeneration);
    findLayer().drawsBackground = autoGeneration;
    layeredCanvas.redraw();
  }

  export async function run(page: Page, element: FrameElement, film: Film): Promise<void> {
    return new Promise((resolve, reject) => {
      painterPage = page;
      painterElement = element;
      painterFilm = film;

      layeredCanvas.mode = "scribble";
      findLayer().setFilm(element, film);
      onDoneHandler = resolve;
    });
  }

  async function onDone() {
    console.log("onScribbleDone")

    painterElement = null;
    painterFilm = null;
    layeredCanvas.mode = null;
    findLayer().setFilm(null, null);

    onDoneHandler();
  }

  function onRedraw() {
    // TODO: Auto generate
  }  

  function onSetTool(e: CustomEvent<any>) {
    console.log("setTool", e.detail);

    findLayer().currentBrush = e.detail;
  }

  export function isPainting() {
    return painterElement != null;
  }
  
  export function undo() {
    findLayer().undo();
  }

  export function redo() {
    findLayer().redo();
  }

  function findLayer() {
    return findPaper().findLayer(InlinePainterLayer);
  }

  function findPaper() {
    return arrayLayer.array.papers[indexOfPage(painterPage)].paper;
  }

  function indexOfPage(page: Page) {
    return $mainBook.pages.indexOf(page);
  }

  export function chase() {
/*
    console.log("chase");
    if (painterAutoGenerate == null) { return; }
    if (painterFilm == null) { return; }
    if (!autoGeneration) { return; }

    painterAutoGenerate.doScribble(
      url,
      painterElement.image.scribble,
      painterElement.prompt,
      lcm,
      painterElement.image.image);
*/
  }

</script>

<div>
{#if painterElement != null}
  <PainterToolBox 
    on:setTool={onSetTool} 
    on:done={onDone} 
    on:redraw={onRedraw} 
    bind:element={painterElement} 
    bind:autoGeneration={autoGeneration} 
    bind:lcm={lcm}/>
  <PainterAutoGenerate bind:this={painterAutoGenerate}/>
{/if}
</div>

<style>
  
</style>