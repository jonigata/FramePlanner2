<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Page } from '../bookeditor/book';
  import { makePlainImage } from '../utils/imageUtil';
  import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import { InlinePainterLayer } from '../lib/layeredCanvas/layers/inlinePainterLayer';
  import { constraintLeaf, calculatePhysicalLayout, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { mainBook } from '../bookeditor/bookStore';
  import PainterToolBox from './PainterToolBox.svelte';
  import PainterAutoGenerate from './PainterAutoGenerate.svelte';
  import { trapezoidBoundingRect } from "../lib/layeredCanvas/tools/geometry/trapezoid";

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
    if (!element.image?.scribble) {
      if (!element.image) {
        element.image = {
          image: null,
          scribble: null,
          n_scale: 1,
          n_translation: [0, 0],
          rotation: 0,
          reverse: [1, 1],
          scaleLock: false,
        };
      }
      let width: number;
      let height: number;
      if (element.image.image) {
        width = element.image.image.naturalWidth;
        height = element.image.image.naturalHeight;
      } else {
        const layout = calculatePhysicalLayout(painterPage.frameTree, painterPage.paperSize, [0,0]);
        const thisLayout = findLayoutOf(layout, element);
        const [x0, y0, x1, y1] = trapezoidBoundingRect(thisLayout.corners);
        // 256の倍数で切り上げ
        let [w, h] = [Math.abs(x1 - x0), Math.abs(y1 - y0)];
        if (w === 0) { w = 1; }
        if (h === 0) { h = 1; }
        width = Math.ceil(w / 256) * 256;
        height = Math.ceil(h / 256) * 256;
      }
      element.image.scribble = await makePlainImage(width, height, false);
      element.gallery.push(element.image.scribble);
      constraintElement();
    }

    layeredCanvas.mode = "scribble";

    findLayer().setElement(element);
  }

  async function onDone() {
    console.log("onScribbleDone")

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
    const paperSize = painterPage.paperSize;
    const pageLayout = calculatePhysicalLayout(painterPage.frameTree, paperSize, [0,0]);
    const layout = findLayoutOf(pageLayout, painterElement);
    if (!layout) { return; }
    painterElement.image.n_scale = 0.001;
    constraintLeaf(paperSize, layout);
  }

  function indexOfPage(page: Page) {
    return $mainBook.pages.indexOf(page);
  }

  export function chase() {
    console.log("chase");
    if (painterAutoGenerate == null) { return; }
    if (painterElement == null) { return; }
    if (!autoGeneration) { return; }

    if (painterElement.image == null) {
      painterElement.image.image = document.createElement('img');
    }

    painterAutoGenerate.doScribble(
      url,
      painterElement.image.scribble,
      painterElement.prompt,
      lcm,
      painterElement.image.image);
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