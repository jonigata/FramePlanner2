<script lang="ts">
  import { type FrameElement, calculatePhysicalLayout, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import type { Film } from '../lib/layeredCanvas/dataModels/film';
  import type { Page } from '../lib/book/book';
  import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import { InlinePainterLayer } from '../lib/layeredCanvas/layers/inlinePainterLayer';
  import { mainBook } from '../bookeditor/workspaceStore';
  import FreehandInspector from './FreehandInspector.svelte';
  import { rectToTrapezoid } from '../lib/layeredCanvas/tools/geometry/trapezoid';
  import { dominantMode } from '../uiStore'

  // TODO: autoGenerate周り未整備、基本的に一旦削除予定

  export let layeredCanvas: LayeredCanvas;
  export let arrayLayer: ArrayLayer;
  let painterPage: Page | null = null;
  let painterFilm: Film | null = null;
  let autoGeneration: boolean = false;
  let onDoneHandler: () => void;

  $: onChangeAutoGeneration(autoGeneration);
  function onChangeAutoGeneration(autoGeneration: boolean) {
    if (layeredCanvas == null) { return; }
    console.log("onChangeAutoGeneration", autoGeneration);
    findLayer().drawsBackground = autoGeneration;
    layeredCanvas.redraw();
  }

  export async function runWithFrame(page: Page, element: FrameElement, film: Film): Promise<void> {
    return new Promise((resolve, reject) => {
      painterPage = page;
      painterFilm = film;

      const paperSize = page.paperSize;
      const paperLayout = calculatePhysicalLayout(page.frameTree, paperSize, [0,0]);
      const layout = findLayoutOf(paperLayout, element)!;
      const trapezoid = layout.corners;

      layeredCanvas.mode = "scribble";
      findLayer().setSurface(film, trapezoid, 0);
      $dominantMode = "painting";
      element.focused = true;
      onDoneHandler = () => { 
        $dominantMode = "standard";
        element.focused = false; 
        resolve(); 
      };
    });
  }

  export async function runWithBubble(page: Page, bubble: Bubble, film: Film): Promise<void> {
    return new Promise((resolve, reject) => {
      painterPage = page;
      painterFilm = film;

      const paperSize = page.paperSize;
      const rect = bubble.getPhysicalRect(paperSize);
      const trapezoid = rectToTrapezoid(rect);

      layeredCanvas.mode = "scribble";
      findLayer().setSurface(film, trapezoid, 1);
      $dominantMode = "painting";
      onDoneHandler = () => { 
        $dominantMode = "standard";
        resolve(); 
      };
    });
  }

  async function onDone() {
    console.log("onScribbleDone")

    painterFilm = null;
    layeredCanvas.mode = null;
    findLayer().setSurface(null, null, 0);

    onDoneHandler();
  }

  function onRedraw() {
    // TODO: Auto generate
  }  

  function onSetTool(e: CustomEvent<any>) {
    findLayer().strokeOptions = e.detail;
  }

  export function isPainting() {
    return painterFilm != null;
  }
  
  export function undo() {
    findLayer().undo();
  }

  export function redo() {
    findLayer().redo();
  }

  function findLayer() {
    return findPaper().findLayer(InlinePainterLayer)!;
  }

  function findPaper() {
    const index = indexOfPage(painterPage);
    return arrayLayer.array.papers[index].paper;
  }

  function indexOfPage(page: Page | null) {
    if (page == null) { return -1; }
    return $mainBook!.pages.indexOf(page);
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
  <FreehandInspector
    on:setTool={onSetTool} 
    on:done={onDone} 
    on:redraw={onRedraw}
    opened={painterFilm != null}/>
</div>

<style>
  
</style>