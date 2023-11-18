<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher, onDestroy } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { FrameElement, calculatePhysicalLayout, collectImages, collectLeaves, constraintLeaf, dealImages, findLayoutOf, makeTrapezoidRect } from './lib/layeredCanvas/frameTree.js';
  import { FloorLayer } from './lib/layeredCanvas/floorLayer.js';
  import { PaperRendererLayer } from './lib/layeredCanvas/paperRendererLayer.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { BubbleLayer } from './lib/layeredCanvas/bubbleLayer.js';
  import { Bubble } from './lib/layeredCanvas/bubble.js';
  import { saveCanvas, copyCanvasToClipboard, makeFilename, canvasToUrl } from './lib/layeredCanvas/saveCanvas.js';
  import { toolTipRequest } from './passiveToolTipStore';
  import { convertPointFromNodeToPage } from './lib/layeredCanvas/convertPoint.js';
  import { bubble, bubbleInspectorPosition, bubbleSplitCursor } from './bubbleInspectorStore';
  import { getHaiku } from './lib/layeredCanvas/haiku.js';
  import { initializeKeyCache, keyDownFlags } from "./lib/layeredCanvas/keyCache.js";
  import { undoStore } from './undoStore';
  import { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontFamily } from "@svelte-web-fonts/google";
  import { makeWhiteImage } from './imageUtil';
  import { InlinePainterLayer } from './lib/layeredCanvas/inlinePainterLayer.js';
  import { postToAiPictors } from './postToAiPictors'
  import { toastStore } from '@skeletonlabs/skeleton';
  import { type Page, type Revision, commitPage, revertPage, revisionEqual, undoPageHistory, redoPageHistory } from './pageStore';

  export let page: Page;
  export let editable = false;
  export let manageKeyCache = false;
  export let painterActive = false;
  export let scale = 1;

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
  let bubbleSnapshot: string = null;

  interface CustomCanvasElement extends HTMLCanvasElement {
    paper: any;
  }

  $:onChangeContainerSize(containerWidth, containerHeight);
  function onChangeContainerSize(w: number, h: number) {
    if (!w || !h) return;
    canvasWidth = w;
    canvasHeight = h;
  }

  $:onSplitCursor($bubbleSplitCursor);
  function onSplitCursor(cursor: number | null) {
    if (cursor == null || bubbleLayer == null) { return; }
    $bubbleSplitCursor = null;

    const text = $bubble.text;
    console.log(text.slice(cursor));
    console.log(text.slice(0,cursor));

    const width = $bubble.size[0];
    const center = $bubble.center;

    const newBubble = bubbleLayer.defaultBubble.clone();
    newBubble.p0 = $bubble.p0;
    newBubble.p1 = $bubble.p1;
    newBubble.initOptions();
    newBubble.text = text.slice(cursor).trimStart();
    bubbleLayer.bubbles.push(newBubble);

    $bubble.text = text.slice(0, cursor).trimEnd();

    if ($bubble.direction === 'v') {
      $bubble.move([center[0] + width / 2, center[1]]);
      newBubble.move([center[0] - width / 2, center[1]]);
    } else {
      $bubble.move([center[0] - width / 2, center[1]]);
      newBubble.move([center[0] + width / 2, center[1]]);
    }

    commit(null);
    bubbleLayer.selectBubble(newBubble);
  }

  $:onChangeScale(scale);
  function onChangeScale(s: number){
    if (layeredCanvas) {
      layeredCanvas.canvas.paper.scale = [s, s];
    }
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

  export function commit(tag: string) {
    console.log("%ccommit", "color:white; background-color:cyan; padding:2px 4px; border-radius:4px;", page.revision, [...page.history], page.historyIndex)
    const newPage = commitPage(page, frameLayer.frameTree, bubbleLayer.bubbles, tag);
    bubbleSnapshot = $bubble ? JSON.stringify(Bubble.decompile(page.paperSize, $bubble)) : null;
    pageRevision = newPage.revision;
    page = newPage;
    console.log([...page.history], page.historyIndex)
  }

  export function commitIfDirty() {
    if (!bubbleSnapshot || !$bubble) { return; }
    const newBubbleSnapshot = JSON.stringify(Bubble.decompile(page.paperSize, $bubble));
    if (bubbleSnapshot !== newBubbleSnapshot) {
      console.log("%ccommitIfDirty", "color:white; background-color:cyan; padding:2px 4px; border-radius:4px;", bubbleSnapshot, newBubbleSnapshot);
      commit(null);
    }
  }

  function revert() {
    console.log("revert");
    page = revertPage(page);
  }

  export function importImage(image: HTMLImageElement) {
    const layout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getPaperSize(), [0,0]);
    frameLayer.importImage(layout, image);
  }

  function generate(element: FrameElement) {
    console.log("generateImages");
    dispatch("generate", element);
  }

  async function scribble(element: FrameElement) {
    console.log("scribble");
    if (!element.image) { 
      element.image = await makeWhiteImage(500, 500);
      element.gallery.push(element.image);
      constraintElement(element, false);
    }

    element.image.fileId = undefined;
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
    commit(null);
  }

  function splice(element: FrameElement) {
    console.log("splice", element);
    const images = collectImages(frameLayer.frameTree);
    dealImages(frameLayer.frameTree, images, null, element);
    commit(null);
  }

  export function constraintElement(element: FrameElement, shrinkBeforeConstraint: boolean) {
    const pageLayout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getPaperSize(), [0,0]);
    const layout = findLayoutOf(pageLayout, element);
    if (!layout) { return; }
    if (shrinkBeforeConstraint) {
      element.scale = [0.001, 0.001];
    }
    constraintLeaf(layout);
  }

  export function scribbleDone() {
    console.log("scribbleDone");
    painterActive = false;
    inlinePainterLayer.setElement(null);
    frameLayer.interactable = true;
    bubbleLayer.interactable = true;
    commit(null);
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
      console.log("%csame revision", "color:white; background-color:purple; padding:2px 4px; border-radius:4px;")
      return; 
    }
    console.log("%cdifferent revision", "color:white; background-color:purple; padding:2px 4px; border-radius:4px;", newPage.revision, pageRevision);

    bubbleLayer.bubbles = newPage.bubbles;
    bubbleLayer.selected = null;

    frameLayer.frameTree = newPage.frameTree;
    frameLayer.frameTree.bgColor = page.paperColor;
    frameLayer.frameTree.borderColor = page.frameColor;
    frameLayer.frameTree.borderWidth = page.frameWidth;

    pageRevision = {...newPage.revision};

    layeredCanvas.setPaperSize(page.paperSize);
    layeredCanvas.redraw();
  }

  $:onChangeBubble($bubble);
  function onChangeBubble(b: Bubble) {
    if (!b) { return; }
    if (!editable) { return; }

    // フォント読み込みが遅れるようなのでヒューリスティック
    setTimeout(() => layeredCanvas.redraw(), 2000);
    setTimeout(() => layeredCanvas.redraw(), 5000);
  }

  function showInspector(b: Bubble) {
    console.log("showInspector");
    const [x0, y0] = b.p0;
    const [x1, y1] = b.p1;
    const [px, py] = [(x0+x1)/2, (y0+y1)/2];
    const [cx, cy] = layeredCanvas.paperPositionToCanvasPosition([px, py]);
    const offset = canvas.height / 2 < cy ? -1 : 1;
    
    bubbleSnapshot = JSON.stringify(Bubble.decompile(page.paperSize, b));
    $bubble = b;
    $bubbleInspectorPosition = {
      center: convertPointFromNodeToPage(canvas, cx, cy),
      height: y1 - y0,
      offset
    };
  }

  function hideInspector() {
    console.log('hideInspector');
    bubbleSnapshot = null;
    $bubble = null;
  }

  async function getDefaultText() {
    return getHaiku();
  }

  onDestroy(() => {
    layeredCanvas.cleanup();
  });

  onMount(async () => {
    layeredCanvas = new LayeredCanvas(
      canvas, 
      page.paperSize,
      (p: [number, number], s: String) => {
        if (editable) {
          if (s) {
            const q = convertPointFromNodeToPage(canvas, ...p);
            q.y -= 25;
            toolTipRequest.set({ message: s, position: q });
          } else {
            toolTipRequest.set(null);
          }
        }
      },
      editable);

    sequentializePointer(FloorLayer);
    if (editable) {
      const floorLayer = new FloorLayer((s: number) => scale = s);
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
        commit(null);
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
      (_bubbles: Bubble[], always: boolean) => {
        if ($bubble) {
          bubbleLayer.defaultBubble = $bubble.clone();
        }
        if (always) {
          commit(null);
        } else {
          commitIfDirty();
        }
      },
      () => {revert();})
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
      await postToAiPictors(
        url, 
        e => {
          toastStore.trigger({ message: e, timeout: 1500});
        }
      );
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

  export function redraw() {
    layeredCanvas.redraw();
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
