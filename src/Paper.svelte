<script type="ts">
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { FrameElement, calculatePhysicalLayout, collectImages, dealImages } from './lib/layeredCanvas/frameTree.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { BubbleLayer } from './lib/layeredCanvas/bubbleLayer.js';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import { arrayVectorToObjectVector, elementCoordToDocumentCoord } from './lib/Misc'
  import { saveCanvas, copyCanvasToClipboard } from './lib/layeredCanvas/saveCanvas.js';
  import { toolTipRequest } from './passiveToolTipStore';
  import { convertPointFromNodeToPage } from './lib/layeredCanvas/convertPoint.js';
  import { bubble, bubbleInspectorPosition } from './bubbleInspectorStore';
  import { useClipboard } from './clipboardStore';
  import { getHaiku } from './lib/layeredCanvas/haiku.js';
  import { Bubble } from './lib/layeredCanvas/bubble.js'; 

  export let width = '140px';
  export let height = '198px';
  export let documentInput: unknown;
  export let documentOutput: unknown;
  export let editable = false;
  export let paperColor = 'white';
  export let frameColor = 'black';
  export let frameWidth = 1;

  let canvas;
  let layeredCanvas;
  let frameLayer;
  let bubbleLayer;
  let history = [];
  let historyIndex = 0;

  const dispatch = createEventDispatcher();

  function addHistory() {
    history.length = historyIndex;
    history.push({
      frameTree: frameLayer.frameTree.clone(),
      bubbles: bubbleLayer.bubbles.map(b => b.clone()),
    })
    historyIndex = history.length;
    console.log("addHistory", historyIndex);
  }

  export function undo() {
    if (historyIndex <= 1) { return; }
    historyIndex--;
    console.log("undo", historyIndex);
    revert();
  }

  export function redo() {
    console.log("redo", historyIndex);
    if (history.length <= historyIndex) { return; }
    historyIndex++;
    const h = history[historyIndex-1];
    frameLayer.frameTree = h.frameTree.clone();
    bubbleLayer.bubbles = h.bubbles.map(b => b.clone());
    layeredCanvas.redraw(); 
  }

  function revert() {
    console.log("revert", historyIndex);
    const h = history[historyIndex-1];
    frameLayer.frameTree = h.frameTree.clone();
    bubbleLayer.bubbles = h.bubbles.map(b => b.clone());
    layeredCanvas.redraw(); 
  }

  export function importImage(image) {
    console.log(frameLayer.frameTree);
    const layout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getCanvasSize(), [0,0]);
    frameLayer.importImage(layout, image);
  }

  function handleClick() { // 非interactableの場合はボタンとして機能する
    dispatch('click');
  }

  afterUpdate(() =>{
    layeredCanvas?.redraw(); 
  });

  $:onInputDocument(documentInput);
  function onInputDocument(newDocumentInput) {
    if (!frameLayer) { return; }
    const images = collectImages(frameLayer.frameTree);
    const newFrameTree = FrameElement.compile(newDocumentInput.frameTree);
    frameLayer.frameTree = newFrameTree;
    dealImages(newFrameTree, images);

    const canvasSize = frameLayer.getCanvasSize();
    bubbleLayer.bubbles = newDocumentInput.bubbles.map(b => Bubble.compile(canvasSize, b));
    bubbleLayer.selected = null;

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

  function outputDocument() {
    console.log("outputDocument");
    const canvasSize = frameLayer.getCanvasSize();
    documentOutput = {
      frameTree: FrameElement.decompile(frameLayer.frameTree),
      bubbles: bubbleLayer.bubbles.map(b => Bubble.decompile(canvasSize, b)),
    }
  }

  function showInspector(b) {
    console.log('showInspector', bubble);
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
    if ($useClipboard) {
      return await navigator.clipboard.readText()
    } else {
      return getHaiku();
    }
  }

  onMount(() => {
    const frameJson = documentInput ? documentInput.frameTree : frameExamples[0];
    const frameTree = FrameElement.compile(frameJson);

    sequentializePointer(FrameLayer);
    layeredCanvas = new LayeredCanvas(
      canvas, 
      (p, s) => {
        if (s) {
          const q = convertPointFromNodeToPage(canvas, ...p);
          toolTipRequest.set({ message: s, position: q });
        } else {
          toolTipRequest.set(null);
        }
      });
    frameLayer = new FrameLayer(
      frameTree,
      editable,
      (frameTree) => {
        console.log("commit frames");
        addHistory();
        outputDocument();
      },
      () => {revert();});
    layeredCanvas.addLayer(frameLayer);

    sequentializePointer(BubbleLayer);
    bubbleLayer = new BubbleLayer(
      editable, 
      showInspector, 
      hideInspector, 
      (bubbles) => {
        console.log("commit bubbles");
        if ($bubble) {
          bubbleLayer.defaultBubble = $bubble.clone();
        }
        addHistory();
        outputDocument();
      },
      () => {revert();},
      getDefaultText)
    layeredCanvas.addLayer(bubbleLayer);
    layeredCanvas.redraw();

    addHistory();
  });

  export function save() {
    console.log("save");
    frameLayer.interactable = false;
    bubbleLayer.interactable = false;
    layeredCanvas.redraw();
    const latestJson = FrameElement.decompile(frameLayer.frameTree);
    saveCanvas(canvas, "comic.png", latestJson);
    frameLayer.interactable = true;
    bubbleLayer.interactable = true;
    layeredCanvas.redraw();
    console.log("save done");
  }
  
  export async function copyToClipboard() {
    console.log("copyToClipboard");
    frameLayer.interactable = false;
    bubbleLayer.interactable = false;
    layeredCanvas.redraw();
    await copyCanvasToClipboard(canvas);
    frameLayer.interactable = true;
    bubbleLayer.interactable = true;
    layeredCanvas.redraw();
    console.log("copyToClipboard done");
  }
</script>


{#if editable}
  <div class="canvas-container" style="width: {width}; height: {height};">
    <canvas width={width} height={height} bind:this={canvas}/>
  </div>    
{:else}
  <div class="canvas-container" style="width: {width}; height: {height};">
    <canvas width={width} height={height} bind:this={canvas} on:click={handleClick} style="cursor: pointer;"/>
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
  canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
