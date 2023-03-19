<script type="ts">
  import { onMount } from 'svelte';
  import { LayeredCanvas, sequentializePointer } from './lib/layeredCanvas/layeredCanvas.js'
  import { initializeKeyCache, keyDownFlags } from './lib/layeredCanvas/keyCache.js';
  import { FrameElement, collectImages, dealImages } from './lib/layeredCanvas/frameTree.js';
  import { FrameLayer } from './lib/layeredCanvas/frameLayer.js';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';

  export let width = '140px';
  export let height = '198px';
  export let frameJson: unknown;
  export let editable = false;

  let canvas;
  let layeredCanvas;
  let latestJson;
  let frameLayer;

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
    layeredCanvas.redraw();

  });
</script>

<canvas width={width} height={height} bind:this={canvas} />

<style>
  canvas {
    background-color: white;
  }
</style>
