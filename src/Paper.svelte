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

  export let width = '140px';
  export let height = '198px';
  export let frameJson: unknown;
  export let editable = false;

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
    const h = history[historyIndex-1];
    frameLayer.frameTree = h.frameTree.clone();
    bubbleLayer.bubbles = h.bubbles.map(b => b.clone());
    layeredCanvas.redraw(); 
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

  $:initializePaper(frameJson);
  function initializePaper(newFrameJson: unknown) {
    if (!frameLayer) { return; }
    const images = collectImages(frameLayer.frameTree);
    const newFrameTree = FrameElement.compile(newFrameJson);
    frameLayer.frameTree = newFrameTree;
    dealImages(newFrameTree, images);
    layeredCanvas.redraw();
  }

  $:changeDefaultBubble($bubble);
  function changeDefaultBubble(newBubble) {
    if (!bubbleLayer || !newBubble) { return; }
    bubbleLayer.defaultBubble = newBubble;
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
    const frameTree = FrameElement.compile(frameJson ?? frameExamples[0]);

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
/*
        latestJson = FrameElement.decompile(frameTree);
        skipJsonChange = true;
        editor.set({ text: JSONstringifyOrder(markUp, 2) });
        skipJsonChange = false;
        frameLayer.constraintAll();
*/
      });
    layeredCanvas.addLayer(frameLayer);

    sequentializePointer(BubbleLayer);
    bubbleLayer = new BubbleLayer(
      editable, 
      showInspector, 
      hideInspector, 
      (bubbles) => {
        console.log("commit bubbles");
        addHistory();
      },
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
