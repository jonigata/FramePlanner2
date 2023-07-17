<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import Paper from './Paper.svelte';
  import { newRevision } from './pageStore';
  import { FrameElement } from './lib/layeredCanvas/frameTree.js';

  let paperWidth = 140;
  let paperHeight = 198;
  let position = { x: 0, y: 0 };
  let pages = [
    {frameTree:FrameElement.compile(frameExamples[2]), bubbles:[], revision: {id:'desktop', revision:1}, paperSize: [140, 198] },
    {frameTree:FrameElement.compile(frameExamples[1]), bubbles:[], revision: {id:'desktop', revision:1}, paperSize: [140, 198] },
    {frameTree:FrameElement.compile(frameExamples[0]), bubbles:[], revision: {id:'desktop', revision:1}, paperSize: [140, 198] }
  ]
</script>

<div class="desktop">
  {#each pages as page}
    <div class="desktop-paper" use:draggable={{ position: position }}>
      <Paper width={paperWidth} height={paperHeight} page={page}/>
    </div>
  {/each}
  <button class="btn btn-sm variant-filled add-document-button" >+</button>
</div>

<style>
  .desktop {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .desktop-paper {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .add-document-button {
    position: absolute;
    right: 16px;
    bottom: 16px;
  }
</style>
