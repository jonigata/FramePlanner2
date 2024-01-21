<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Book, Page, BookOperators, HistoryTag } from '../bookeditor/book';
  import { makePlainImage } from '../utils/imageUtil';
  import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import { InlinePainterLayer } from '../lib/layeredCanvas/layers/inlinePainterLayer';
  import { constraintLeaf, calculatePhysicalLayout, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { mainBook, bookEditor, viewport, newPageProperty } from '../bookeditor/bookStore';
  import PainterToolBox from './PainterToolBox.svelte';
  import PainterAutoGenerate from './PainterAutoGenerate.svelte';

  const dispatch = createEventDispatcher();

  export let layeredCanvas: LayeredCanvas;
  export let arrayLayer: ArrayLayer;
  let painterPage: Page = null;
  let painterElement: FrameElement = null;
  let autoGeneration: boolean = false;
  let lcm: boolean = false;
  let painterAutoGenerate: PainterAutoGenerate = null;
  let url: string = "http://192.168.68.111:7860";
  
  $: onChangeAutoGeneration(autoGeneration);
  function onChangeAutoGeneration(autoGeneration: boolean) {
    if (layeredCanvas == null) { return; }
    console.log("onChangeAutoGeneration", autoGeneration);
    findLayer().drawsBackground = autoGeneration;
    layeredCanvas.redraw();
  }

  export async function start(page: Page, element: FrameElement) {
    painterPage = page;
    painterElement = element;

    console.log("START", element.showsScribble);
    /*
    if (!element.image) { 
      element.image = await makePlainImage(512, 512, true);
      element.gallery.push(element.image);
      constraintElement(page, element, true);
    }
    */
    if (!element.scribble) {
      const width = element.image ? element.image.naturalWidth : 512;
      const height = element.image ? element.image.naturalHeight : 512;
      element.scribble = await makePlainImage(width, height, false);
      element.gallery.push(element.scribble);
      constraintElement(true);
    }

    layeredCanvas.mode = "scribble";

    findLayer().setElement(element);
  }

  async function onDone() {
    console.log("onScribbleDone")

    /*
    // merge
    const element = painterElement;
    await element.scribble.decode();
    const canvas = document.createElement('canvas');
    canvas.width = element.image.naturalWidth;
    canvas.height = element.image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(element.image, 0, 0);
    ctx.drawImage(element.scribble, 0, 0);
    element.image.src = canvas.toDataURL();
    await element.image.decode();

    element.gallery = element.gallery.filter((e) => e !== element.scribble);
    element.scribble = null;
    */

    painterElement = null;
    layeredCanvas.mode = null;
    findLayer().setElement(null);

    dispatch("done");
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

  function constraintElement() {
    const pageLayout = calculatePhysicalLayout(painterPage.frameTree, painterPage.paperSize, [0,0]);
    const layout = findLayoutOf(pageLayout, painterElement);
    if (!layout) { return; }
    painterElement.scale = [0.001, 0.001];
    constraintLeaf(layout);
  }

  function indexOfPage(page: Page) {
    return $mainBook.pages.indexOf(page);
  }

  export function chase() {
    console.log("chase");
    if (painterAutoGenerate == null) { return; }
    if (painterElement == null) { return; }
    if (!autoGeneration) { return; }

    painterAutoGenerate.doScribble(
      url,
      painterElement.scribble,
      painterElement.prompt,
      lcm,
      painterElement.image);
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