<script type="ts">
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { initializeKeyCache, keyDownFlags } from './lib/layeredCanvas/keyCache.js';
  import { FrameElement, calculatePhysicalLayout, collectImages, dealImages } from './lib/layeredCanvas/frameTree.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { BubbleLayer } from './lib/layeredCanvas/bubbleLayer.js';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import BubbleInspector from './BubbleInspector.svelte';
  import { arrayVectorToObjectVector, elementCoordToDocumentCoord } from './lib/Misc'
  import { saveCanvas, copyCanvasToClipboard } from './lib/layeredCanvas/saveCanvas.js';

  export let width = '140px';
  export let height = '198px';
  export let frameJson: unknown;
  export let editable = false;

  let canvas;
  let layeredCanvas;
  let latestJson;
  let frameLayer;
  let bubbleLayer;
  let isBubbleInspectorOpened;
  let bubbleInspectorPosition;
  let bubble;

  const dispatch = createEventDispatcher();

  export function importImage(image) {
    console.log(frameLayer.frameTree);
    const layout = calculatePhysicalLayout(frameLayer.frameTree, frameLayer.getCanvasSize(), [0,0]);
    frameLayer.importImage(layout, image);
  }

  function handleClick() {
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
    latestJson = newFrameJson;

  }

  $:changeDefaultBubble(bubble);
  function changeDefaultBubble(newBubble) {
    console.log('changeDefaultBubble', newBubble);
    if (!bubbleLayer || !newBubble) { return; }
    bubbleLayer.defaultBubble = newBubble;
  }

  function showInspector(b, p) {
    console.log('showInspector', bubble);
    bubbleInspectorPosition = elementCoordToDocumentCoord(canvas, arrayVectorToObjectVector(p));
    isBubbleInspectorOpened = true;
    bubble = b;
  }

  function hideInspector() {
    console.log('hideInspector');
    isBubbleInspectorOpened = false;
  }

  function submit() {
    console.log('submit');
  }

  onMount(() => {
    const frameTree = FrameElement.compile(frameJson ?? frameExamples[0]);

    sequentializePointer(FrameLayer);
    layeredCanvas = new LayeredCanvas(canvas);
    frameLayer = new FrameLayer(
        frameTree,
        editable,
        (frameTree) => {
            const markUp = FrameElement.decompile(frameTree);
/*
            skipJsonChange = true;
            editor.set({ text: JSONstringifyOrder(markUp, 2) });
            skipJsonChange = false;
*/

            frameLayer.constraintAll();
        });
    layeredCanvas.addLayer(frameLayer);

    sequentializePointer(BubbleLayer);
    bubbleLayer = new BubbleLayer(editable, showInspector, hideInspector, submit)
    layeredCanvas.addLayer(bubbleLayer);

    layeredCanvas.redraw();

    initializeKeyCache(canvas, (code) => {
      return code === "AltLeft" || code === "AltRight" ||
          code === "ControlLeft" || code === "ControlRight" ||
          code === "KeyQ" || code === "KeyW" || code === "KeyS" || code === "KeyF" ||
          code === "Space";
    });
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
  <BubbleInspector isOpen={isBubbleInspectorOpened} position={bubbleInspectorPosition} bind:bubble={bubble}/>
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
