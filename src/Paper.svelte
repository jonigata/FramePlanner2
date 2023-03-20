<script type="ts">
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { initializeKeyCache, keyDownFlags } from './lib/layeredCanvas/keyCache.js';
  import { FrameElement, collectImages, dealImages } from './lib/layeredCanvas/frameTree.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { BubbleLayer } from './lib/layeredCanvas/bubbleLayer.js';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import BubbleInspector from './BubbleInspector.svelte';
  import { arrayVectorToObjectVector, elementCoordToDocumentCoord } from './lib/Misc'

  export let width = '140px';
  export let height = '198px';
  export let frameJson: unknown;
  export let editable = false;

  let canvas;
  let layeredCanvas;
  let latestJson;
  let frameLayer;
  let isBubbleInspectorOpened;
  let bubbleInspectorPosition;

  const dispatch = createEventDispatcher();

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

  function showInspector(bubble, p) {
    console.log('showInspector', bubble);
    bubbleInspectorPosition = elementCoordToDocumentCoord(canvas, arrayVectorToObjectVector(p));
    isBubbleInspectorOpened = true;
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
    let bubbleLayer = new BubbleLayer(showInspector, hideInspector, submit)
    layeredCanvas.addLayer(bubbleLayer);

    layeredCanvas.redraw();

    initializeKeyCache(canvas, (code) => {
      return code === "AltLeft" || code === "AltRight" ||
          code === "ControlLeft" || code === "ControlRight" ||
          code === "KeyQ" || code === "KeyW" || code === "KeyS" || code === "KeyF";
    });
  });
</script>


{#if editable}
  <canvas width={width} height={height} bind:this={canvas}/>
  <BubbleInspector isOpen={isBubbleInspectorOpened} position={bubbleInspectorPosition}/>
{:else}
  <canvas width={width} height={height} bind:this={canvas} on:click={handleClick}/>
{/if}


<style>
  canvas {
    background-color: white;
  }
</style>
