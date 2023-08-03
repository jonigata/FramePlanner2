<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples.js';
  import Paper from './Paper.svelte';
  import { FrameElement } from './lib/layeredCanvas/frameTree.js';
  import { type Page, mainPage } from './pageStore';

  let position = { x: 0, y: 0 };
  let pages = [
    makePage(2),
    makePage(1),
    makePage(0),
  ]

  function makePage(n): Page {
    return {
      frameTree: FrameElement.compile(frameExamples[n]), 
      bubbles:[], 
      revision: {id:'desktop', revision:1}, 
      paperSize: [140, 198],
      paperColor: '#ffffff',
      frameColor: '#000000',
      frameWidth: 2,
    };
  }

  function onDoubleClick(page) {
    $mainPage = page;
  }
</script>

<div class="desktop">
  {#each pages as page}
    <div class="desktop-paper" use:draggable={{ position: position }} on:dblclick={() => onDoubleClick(page)}>
      <Paper page={page}/>
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
  }
  .add-document-button {
    position: absolute;
    right: 16px;
    bottom: 16px;
  }
</style>
