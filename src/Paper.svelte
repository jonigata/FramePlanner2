<script type="ts">
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { FrameElement, calculatePhysicalLayout, collectImages, collectLeaves, constraintLeaf, dealImages, findLayoutOf, makeTrapezoidRect } from './lib/layeredCanvas/frameTree.js';
  import { FloorLayer } from './lib/layeredCanvas/floorLayer.js';
  import { PaperRendererLayer } from './lib/layeredCanvas/paperRendererLayer.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { BubbleLayer } from './lib/layeredCanvas/bubbleLayer.js';
  import type { Bubble } from './lib/layeredCanvas/bubble.js';
  import { arrayVectorToObjectVector, elementCoordToDocumentCoord } from './lib/Misc'
  import { saveCanvas, copyCanvasToClipboard, makeFilename, canvasToUrl } from './lib/layeredCanvas/saveCanvas.js';
  import { toolTipRequest } from './passiveToolTipStore';
  import { convertPointFromNodeToPage } from './lib/layeredCanvas/convertPoint.js';
  import { bubble, bubbleInspectorPosition } from './bubbleInspectorStore';
  import { getHaiku } from './lib/layeredCanvas/haiku.js';
  import { initializeKeyCache, keyDownFlags } from "./lib/layeredCanvas/keyCache.js";
  import { undoStore } from './undoStore';
  import { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontFamily } from "@svelte-web-fonts/google";
  import { frameImageGeneratorTarget, frameImageConstraintToken } from "./frameImageGeneratorStore";
  import FrameImageGenerator from './FrameImageGenerator.svelte';
  import { makeWhiteImage } from './imageUtil';
  import { InlinePainterLayer } from './lib/layeredCanvas/inlinePainterLayer.js';
  import { type Page, type Revision, setRevision, getIncrementedRevision, revisionEqual, addHistory, undoPageHistory, redoPageHistory } from './pageStore';

  export let page: Page;
  export let editable = false;
  export let manageKeyCache = false;
  export let painterActive = false;

  let containerWidth: number;
  let containerHeight: number;
  let canvasWidth: number;
  let canvasHeight: number;
  let canvas: HTMLCanvasElement;
  let layeredCanvas: LayeredCanvas;
  let frameLayer: FrameLayer;
  let bubbleLayer: BubbleLayer;
  let inlinePainterLayer: InlinePainterLayer;
  let pageRevision: Revision | null = null;

  interface CustomCanvasElement extends HTMLCanvasElement {
    paper: any;
  }

  $:onChangeContainerSize(containerWidth, containerHeight);
  function onChangeContainerSize(w: number, h: number) {
    if (!w || !h) return;
    canvasWidth = w;
    canvasHeight = h;
  }

  $:onFrameImageConstraint($frameImageConstraintToken);
  function onFrameImageConstraint(token: boolean) {
    if (!token) return;
    console.log("onFrameImageConstraint", token);
    frameLayer.constraintAll();
    layeredCanvas.redraw();
    $frameImageConstraintToken = false;
  }

  const dispatch = createEventDispatcher();

  function isPainting() {
    return painterActive;
  }

  export function undo() {
    if (isPainting()) {
      inlinePainterLayer.undo();
    } else {
      undoPageHistory(page);
      revert();
    }
  }

  export function redo() {
    if (isPainting()) {
      inlinePainterLayer.redo();
    } else {
      redoPageHistory(page);
      revert();
    }
  }

  export function commit() {
    // console.log("commit", page.revision, [...page.history], page.historyIndex)
    addHistory(page, frameLayer.frameTree, bubbleLayer.bubbles);
    outputPage();
  }

  function revert() {
    console.log("revert", page.historyIndex);
    const h = page.history[page.historyIndex-1];
    frameLayer.frameTree = h.frameTree.clone();
    bubbleLayer.bubbles = h.bubbles.map(b => b.clone());
    bubbleLayer.selected = null;
    layeredCanvas.redraw(); 
  }

  export function importImage(image: HTMLImageElement) {
    const layout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getPaperSize(), [0,0]);
    frameLayer.importImage(layout, image);
  }

  function generate(element: FrameElement) {
    console.log("generateImages");
    $frameImageGeneratorTarget = element;
  }

  async function scribble(element: FrameElement) {
    console.log("scribble");
    if (!element.image) { 
      element.image = await makeWhiteImage(500, 500);
      element.gallery.push(element.image);
      constraintElement(element);
    }

    inlinePainterLayer.setElement(element);
    painterActive = true;
    frameLayer.interactable = false;
    bubbleLayer.interactable = false;
    dispatch('painterActive', painterActive);
  }

  function insert(element: FrameElement) {
    console.log("insert", element);
    const images = collectImages(frameLayer.frameTree);
    dealImages(frameLayer.frameTree, images, element, null);
    commit();
  }

  function splice(element: FrameElement) {
    console.log("splice", element);
    const images = collectImages(frameLayer.frameTree);
    dealImages(frameLayer.frameTree, images, null, element);
    commit();
  }

  function constraintElement(element: FrameElement) {
    const pageLayout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getPaperSize(), [0,0]);
    const layout = findLayoutOf(pageLayout, element);
    if (!layout) { return; }
    constraintLeaf(layout);
  }

  export function scribbleDone() {
    console.log("scribbleDone");
    painterActive = false;
    inlinePainterLayer.setElement(null);
    frameLayer.interactable = true;
    bubbleLayer.interactable = true;
    commit();
  }

  export function setTool(tool: any) {
    console.log("setTool", tool);
    inlinePainterLayer.currentBrush = tool;
  }

  function handleClick() { // 非interactableの場合はボタンとして機能する
    dispatch('click');
  }

  afterUpdate(() =>{
    layeredCanvas?.redraw(); 
  });

  $:onUpdatePage(page);
  function onUpdatePage(newPage: Page) {
    if (!frameLayer) { return; }
    if (revisionEqual(newPage.revision, pageRevision)) { 
      // console.log("same revision")
      return; 
    }
    console.log("different revision", newPage.revision, pageRevision);

    bubbleLayer.bubbles = newPage.bubbles;
    bubbleLayer.selected = null;

    frameLayer.frameTree = newPage.frameTree;
    frameLayer.frameTree.bgColor = page.paperColor;
    frameLayer.frameTree.borderColor = page.frameColor;
    frameLayer.frameTree.borderWidth = page.frameWidth;

    if (pageRevision) {
      commit();
    }
    pageRevision = {...newPage.revision};

    layeredCanvas.setPaperSize(page.paperSize);
    layeredCanvas.redraw();
  }

  $:onChangeBubble($bubble);
  function onChangeBubble(_b: Bubble) {
    // フォント読み込みが遅れるようなのでヒューリスティック
    setTimeout(() => layeredCanvas.redraw(), 2000);
    setTimeout(() => layeredCanvas.redraw(), 5000);
  }

  function outputPage() {
    const newPage = {...page};
    pageRevision = getIncrementedRevision(page);
    setRevision(newPage, pageRevision);
    page = newPage;
  }

  function showInspector(b: Bubble) {
    const [x0, y0] = b.p0;
    const [x1, y1] = b.p1;
    const [cx, cy] = [(x0+x1)/2, (y0+y1)/2];
    const offset = canvas.height / 2 < cy ? 1 : -1;
    
    $bubbleInspectorPosition = {
      center: elementCoordToDocumentCoord(canvas, arrayVectorToObjectVector([cx,cy])),
      height: y1 - y0,
      offset
    };
    $bubble = b;
  }

  function hideInspector() {
    console.log('hideInspector');
    $bubble.redraw = null; // 一応
    $bubble = null;
  }

  async function getDefaultText() {
    return getHaiku();
  }

  onMount(async () => {
    layeredCanvas = new LayeredCanvas(
      canvas, 
      page.paperSize,
      (p: [number, number], s: String) => {
        if (editable) {
          if (s) {
            const q = convertPointFromNodeToPage(canvas, ...p);
            toolTipRequest.set({ message: s, position: q });
          } else {
            toolTipRequest.set(null);
          }
        }
      });

    sequentializePointer(FloorLayer);
    if (editable) {
      const floorLayer = new FloorLayer();
      layeredCanvas.addLayer(floorLayer);
    }

    const paperRendererLayer = new PaperRendererLayer();
    layeredCanvas.addLayer(paperRendererLayer);

    sequentializePointer(FrameLayer);
    frameLayer = new FrameLayer(
      paperRendererLayer,
      page.frameTree,
      editable,
      (_frameTree: FrameElement) => {
        console.log("commit frames");
        commit();
      },
      () => {revert();},
      (frameElement: FrameElement) => {generate(frameElement);},
      (frameElement: FrameElement) => {scribble(frameElement);},
      (frameElement: FrameElement) => {insert(frameElement);},
      (frameElement: FrameElement) => {splice(frameElement);},
      );
    layeredCanvas.addLayer(frameLayer);

    sequentializePointer(BubbleLayer);
    bubbleLayer = new BubbleLayer(
      paperRendererLayer,
      editable, 
      frameLayer,
      showInspector, 
      hideInspector, 
      (_bubbles: Bubble[]) => {
        if ($bubble) {
          bubbleLayer.defaultBubble = $bubble.clone();
        }
        commit();
      },
      () => {revert();},
      getDefaultText)
    layeredCanvas.addLayer(bubbleLayer);

    sequentializePointer(InlinePainterLayer);
    inlinePainterLayer = new InlinePainterLayer(frameLayer);
    layeredCanvas.addLayer(inlinePainterLayer);

    layeredCanvas.redraw();

    if (manageKeyCache) {
      initializeKeyCache(canvas, (code: string) => {
        if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) && (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"])) {
          console.log("paper ctrl+shift+z")
          $undoStore.redo();
          return false;
        }
        if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"])) {
          console.log("paper ctrl+z")
          $undoStore.undo();
          return false;
        }
        return code === "AltLeft" || code === "AltRight" ||
            code === "ControlLeft" || code === "ControlRight" ||
            code === "ShiftLeft" || code === "ShiftRight" ||
            code === "KeyQ" || code === "KeyW" || code === "KeyS" || 
            code === "KeyF" || code === "KeyR" || code === "KeyD" || code === "KeyB" ||
            code === "KeyT" || code === "KeyY" || code === "KeyE" ||
            code === "Space";
      });
    }

    if (editable) {
      addHistory(page, frameLayer.frameTree, bubbleLayer.bubbles);
    }
  });

  async function swapCanvas(f: (c: CustomCanvasElement) => Promise<void>) {
    const tmpCanvas = document.createElement("canvas") as CustomCanvasElement;
    tmpCanvas.width = page.paperSize[0]
    tmpCanvas.height = page.paperSize[1]
    tmpCanvas.paper = {};
    tmpCanvas.paper.size = page.paperSize;
    tmpCanvas.paper.translate = [0,0];
    tmpCanvas.paper.viewTranslate = [0,0];
    tmpCanvas.paper.scale = [1,1];
    layeredCanvas.canvas = tmpCanvas;
    layeredCanvas.context = tmpCanvas.getContext("2d");
    frameLayer.interactable = false;
    bubbleLayer.interactable = false;
    layeredCanvas.redraw();
    await f(tmpCanvas);
    layeredCanvas.canvas = canvas;
    layeredCanvas.context = canvas.getContext("2d");
    frameLayer.interactable = true;
    bubbleLayer.interactable = true;
    layeredCanvas.redraw();
  }

  export function save() {
    console.log("save");
    swapCanvas(async (c: CustomCanvasElement) => {
      const latestJson = FrameElement.decompile(frameLayer.frameTree);
      saveCanvas(c, makeFilename("png"), latestJson);
    });
  }

  export function postToAIPictors() {
    console.log("postToAIPictors");
    swapCanvas(async (c: CustomCanvasElement) => {
      const latestJson = FrameElement.decompile(frameLayer.frameTree);
      const url = canvasToUrl(c, latestJson);
      const postUrl = "https://www.aipictors.com/post/#" + url.substring(5) + "&collabotype=9835N8UoVOpup-yAUqXQV";
      console.log(postUrl);
      window.open(postUrl, "_blank");
    });
  }
  
  export async function copyToClipboard() {
    console.log("copyToClipboard");
    swapCanvas(async (c: CustomCanvasElement) => {
      await copyCanvasToClipboard(c);
    });
  }

  export function pourScenario(s: any) { // TODO: 型が雑
    const paperLayout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getPaperSize(), [0,0]);
    const leaves = collectLeaves(frameLayer.frameTree);
    s.scenes.forEach((scene: any, index: number) => {
      const leaf = leaves[index];
      leaf.prompt = scene.description;

      const layout = findLayoutOf(paperLayout, leaf);
      const r = makeTrapezoidRect(layout.corners);
      const c = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
      scene.bubbles.forEach((b:any) => {
        const bubbles = bubbleLayer.createTextBubble(b[1]);
        bubbles[0].shape = "rounded";
        bubbles[0].initOptions();
        bubbles[0].move(c);
      })
    });
  }

  function getFontStyle2(fontFamily: string, fontWeight: string): string {
    return getFontStyle(fontFamily as GoogleFontFamily, fontWeight as GoogleFontVariant);
  }
</script>


{#if editable}
  <div class="canvas-container fullscreen" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
    <canvas width={canvasWidth} height={canvasHeight} bind:this={canvas}/>
    {#if bubbleLayer?.defaultBubble}
    <p style={getFontStyle2(bubbleLayer.defaultBubble.fontFamily, "400")}>あ</p> <!-- 事前読み込み、ローカルフォントだと多分エラー出る -->
    {/if}
  </div>    
{:else}
  <div class="canvas-container" style="width: {page.paperSize[0]}px; height: {page.paperSize[1]}px;">
    <canvas width={page.paperSize[0]} height={page.paperSize[1]} bind:this={canvas} on:click={handleClick} style="cursor: pointer;"/>
  </div>    
{/if}

<FrameImageGenerator/>

<style>
  .canvas-container {
    position: relative;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
  }
  .fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    touch-action: none;
  }
</style>
