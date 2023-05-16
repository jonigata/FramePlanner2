<script type="ts">
  import { onMount, afterUpdate, createEventDispatcher, tick } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { FrameElement, calculatePhysicalLayout, collectImages, constraintLeaf, dealImages, findLayoutOf } from './lib/layeredCanvas/frameTree.js';
  import { trapezoidBoundingRect } from "./lib/layeredCanvas/trapezoid.js";
  import { FloorLayer } from './lib/layeredCanvas/floorLayer.js';
  import { PaperRendererLayer } from './lib/layeredCanvas/paperRendererLayer.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { BubbleLayer } from './lib/layeredCanvas/bubbleLayer.js';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import { arrayVectorToObjectVector, elementCoordToDocumentCoord } from './lib/Misc'
  import { saveCanvas, copyCanvasToClipboard } from './lib/layeredCanvas/saveCanvas.js';
  import { toolTipRequest } from './passiveToolTipStore';
  import { convertPointFromNodeToPage } from './lib/layeredCanvas/convertPoint.js';
  import { bubble, bubbleInspectorPosition } from './bubbleInspectorStore';
  import { getHaiku } from './lib/layeredCanvas/haiku.js';
  import { Bubble } from './lib/layeredCanvas/bubble.js'; 
  import { initializeKeyCache, keyDownFlags } from "./lib/layeredCanvas/keyCache.js";
  import { undoStore } from './undoStore';
  import GoogleFont, { getFontStyle } from "@svelte-web-fonts/google";
  import { frameImageGeneratorTarget, frameImageConstraintToken } from "./frameImageGeneratorStore";
  import FrameImageGenerator from './FrameImageGenerator.svelte';
  import { makeWhiteImage } from './imageUtil';
  import { InlinePainterLayer } from './lib/layeredCanvas/inlinePainterLayer.js';

  export let width = 140;
  export let height = 198;
  export let documentInput: unknown;
  export let documentOutput: unknown;
  export let editable = false;
  export let paperColor = 'white';
  export let frameColor = 'black';
  export let frameWidth = 1;
  export let manageKeyCache = false;
  export let painterActive = false;

  let containerWidth;
  let containerHeight;
  let canvasWidth;
  let canvasHeight;
  let canvas;
  let layeredCanvas;
  let frameLayer;
  let bubbleLayer;
  let inlinePainterLayer;
  let history = [];
  let historyIndex = 0;

  $:onChangeContainerSize(containerWidth, containerHeight);
  function onChangeContainerSize(w, h) {
    if (!w || !h) return;
    canvasWidth = w;
    canvasHeight = h;
  }

  $:onFrameImageConstraint($frameImageConstraintToken);
  function onFrameImageConstraint(token) {
    if (!token) return;
    console.log("onFrameImageConstraint", token);
    frameLayer.constraintAll();
    layeredCanvas.redraw();
    $frameImageConstraintToken = false;
  }

  const dispatch = createEventDispatcher();

  function addHistory() {
    history.length = historyIndex;
    history.push({
      frameTree: frameLayer.frameTree.clone(),
      bubbles: bubbleLayer.bubbles.map(b => b.clone()),
    })
    historyIndex = history.length;
  }

  function isPainting() {
    return painterActive;
  }

  export function undo() {
    if (isPainting()) {
      inlinePainterLayer.undo();
    } else {
      console.log("undo", historyIndex);
      if (historyIndex <= 1) { return; }
      historyIndex--;
      revert();
    }
  }

  export function redo() {
    if (isPainting()) {
      inlinePainterLayer.redo();
    } else {
      console.log("redo", historyIndex);
      if (history.length <= historyIndex) { return; }
      historyIndex++;
      const h = history[historyIndex-1];
      frameLayer.frameTree = h.frameTree.clone();
      bubbleLayer.bubbles = h.bubbles.map(b => b.clone());
      bubbleLayer.selected = null;
      layeredCanvas.redraw(); 
    }
  }

  export function commit() {
    console.log("commit");
    addHistory();
    outputDocument();
  }

  function revert() {
    console.log("revert", historyIndex);
    const h = history[historyIndex-1];
    frameLayer.frameTree = h.frameTree.clone();
    bubbleLayer.bubbles = h.bubbles.map(b => b.clone());
    bubbleLayer.selected = null;
    layeredCanvas.redraw(); 
  }

  export function importImage(image) {
    console.log(frameLayer.frameTree);
    const layout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getPaperSize(), [0,0]);
    frameLayer.importImage(layout, image);
  }

  function generate(frameTreeElement) {
    console.log("generateImages");
    $frameImageGeneratorTarget = frameTreeElement;
  }

  async function scribble(element) {
    console.log("scribble");
    if (!element.image) { 
      element.image = await makeWhiteImage(500, 500);
      element.gallery.push(element.image);
    }

    inlinePainterLayer.setElement(element);
    painterActive = true;
    frameLayer.interactable = false;
    bubbleLayer.interactable = false;
    dispatch('painterActive', painterActive);
  }

  export function scribbleDone() {
    console.log("scribbleDone");
    painterActive = false;
    inlinePainterLayer.setElement(null);
    frameLayer.interactable = true;
    bubbleLayer.interactable = true;
    commit();
  }

  export function chooseTool(tool) {
    console.log("chooseTool", tool);
    inlinePainterLayer.currentBrush = tool;
  }

  function handleClick() { // 非interactableの場合はボタンとして機能する
    dispatch('click');
  }

  afterUpdate(() =>{
    layeredCanvas?.redraw(); 
  });

  $:onChangePaperSize(width, height);
  function onChangePaperSize(w, h) {
    console.log("onChangePaperSize", w, h);
    if (!layeredCanvas) { return; }
    layeredCanvas.setPaperSize([w, h]);
  }

  $:onInputDocument(documentInput);
  function onInputDocument(newDocumentInput) {
    if (!frameLayer) { return; }
    const images = collectImages(frameLayer.frameTree);
    const newFrameTree = FrameElement.compile(newDocumentInput.frameTree);
    frameLayer.frameTree = newFrameTree;
    dealImages(newFrameTree, images);

    const paperSize = frameLayer.getPaperSize();
    bubbleLayer.bubbles = newDocumentInput.bubbles.map(b => Bubble.compile(paperSize, b));
    bubbleLayer.selected = null;
    commit();

    layeredCanvas.redraw();
  }

  $:onChangePaperColor(paperColor);
  function onChangePaperColor(newPaperColor) {
    if (!frameLayer) { return; }
    frameLayer.frameTree.bgColor = newPaperColor;
    layeredCanvas.redraw();
  }

  $:onChangeFrameColor(frameColor);
  function onChangeFrameColor(newFrameColor) {
    if (!frameLayer) { return; }
    frameLayer.frameTree.borderColor = newFrameColor;
    layeredCanvas.redraw();
  }

  $:onChangeFrameWidth(frameWidth);
  function onChangeFrameWidth(newFrameWidth) {
    if (!frameLayer) { return; }
    frameLayer.frameTree.borderWidth = newFrameWidth;
    layeredCanvas.redraw();
  }

  $:onChangeBubble($bubble);
  function onChangeBubble(b) {
    // フォント読み込みが遅れるようなのでヒューリスティック
    setTimeout(() => layeredCanvas.redraw(), 2000);
    setTimeout(() => layeredCanvas.redraw(), 5000);
  }

  function outputDocument() {
    const paperSize = frameLayer.getPaperSize();
    documentOutput = {
      frameTree: FrameElement.decompile(frameLayer.frameTree),
      bubbles: bubbleLayer.bubbles.map(b => Bubble.decompile(paperSize, b)),
    }
  }

  function showInspector(b) {
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
    $bubble = null;
  }

  async function getDefaultText() {
    return getHaiku();
  }

  onMount(async () => {
    const frameJson = documentInput ? documentInput.frameTree : frameExamples[0];
    const frameTree = FrameElement.compile(frameJson);

    layeredCanvas = new LayeredCanvas(
      canvas, 
      [width, height],
      (p, s) => {
        if (s) {
          const q = convertPointFromNodeToPage(canvas, ...p);
          toolTipRequest.set({ message: s, position: q });
        } else {
          toolTipRequest.set(null);
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
      frameTree,
      editable,
      (frameTree) => {
        console.log("commit frames");
        commit();
      },
      () => {revert();},
      (frameTreeElement) => {generate(frameTreeElement);},
      (frameTreeElement) => {scribble(frameTreeElement);}
      );
    layeredCanvas.addLayer(frameLayer);

    sequentializePointer(BubbleLayer);
    bubbleLayer = new BubbleLayer(
      paperRendererLayer,
      editable, 
      frameLayer,
      showInspector, 
      hideInspector, 
      (bubbles) => {
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
      initializeKeyCache(canvas, (code) => {
        if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) && (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"])) {
          console.log("ctrl+shift+z")
          $undoStore.redo();
          return false;
        }
        if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"])) {
          console.log("ctrl+z")
          $undoStore.undo();
          return false;
        }
        return code === "AltLeft" || code === "AltRight" ||
            code === "ControlLeft" || code === "ControlRight" ||
            code === "ShiftLeft" || code === "ShiftRight" ||
            code === "KeyQ" || code === "KeyW" || code === "KeyS" || 
            code === "KeyF" || code === "KeyR" || code === "KeyD" || code === "KeyB" ||
            code === "KeyT" || code === "KeyY" || 
            code === "Space";
      });
    }

    if (editable) {

    }

    addHistory();
  });

  async function swapCanvas(f) {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    tmpCanvas.paper = {};
    tmpCanvas.paper.size = [width, height];
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
    function zeropadding(n) {
      return n < 10 ? "0" + n : n;
    }

    swapCanvas(async (c) => {
      const latestJson = FrameElement.decompile(frameLayer.frameTree);
      const date = new Date();
      const filename = `comic-${date.toLocaleDateString('sv-SE')}-${zeropadding(date.getHours())}-${zeropadding(date.getMinutes())}-${zeropadding(date.getSeconds())}.png`;
      saveCanvas(c, filename, latestJson);
    });
  }
  
  export async function copyToClipboard() {
    console.log("copyToClipboard");
    swapCanvas(async (c) => {
      await copyCanvasToClipboard(c);
    });
  }
</script>


{#if editable}
  <div class="canvas-container fullscreen" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
    <canvas width={canvasWidth} height={canvasHeight} bind:this={canvas}/>
    {#if bubbleLayer?.defaultBubble}
    <GoogleFont fonts="{[{family: bubbleLayer.defaultBubble.fontFamily,variants: ["400"],},]}" display="swap" />
    <p style={getFontStyle(bubbleLayer.defaultBubble.fontFamily, "400")}>あ</p> <!-- 事前読み込み、ローカルフォントだと多分エラー出る -->
    {/if}
  </div>    
{:else}
  <div class="canvas-container" style="width: {width}px; height: {height}px;">
    <canvas width={width} height={height} bind:this={canvas} on:click={handleClick} style="cursor: pointer;"/>
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
  }
</style>
