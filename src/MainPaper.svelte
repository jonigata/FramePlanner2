<script type="ts">
  import { onMount } from 'svelte';
  import Paper from './Paper.svelte';
  import { saveToken, clipboardToken, importingImage } from './paperStore';
  import { undoStore, commitToken } from './undoStore';
  import { mainPage } from './pageStore';
  import PainterToolBox from './PainterToolBox.svelte';

  let paper;
  let painterActive = false;
  let toolBox = null;

  $:save($saveToken);
  function save(token) {
    if (!token) return;
    console.log('tokenValue', token);
    paper.save();
    $saveToken = false;
  }

  $:copyToClipboard($clipboardToken);
  function copyToClipboard(token) {
    if (!token) return;
    console.log('tokenValue', token);
    paper.copyToClipboard();
    $clipboardToken = false;
  }

  $:importImage($importingImage);
  function importImage(image) {
    if (!image) return;
    paper.importImage(image);
    $importingImage = null;
  }

  $:onCommitToken($commitToken);
  async function onCommitToken(token) {
    if (!token) return;
    console.log('tokenValue', token);
    paper.commit();
    $commitToken = false;
  }

  async function onPainterActive(e) {
    console.log('onPainterActive', e.detail);
    painterActive = e.detail;
  }

  function onScribbleDone() {
    console.log('onScribbleDone');
    paper.scribbleDone();
    painterActive = false;
  }

  function onSetTool(e) {
    console.log('onSetTool', e.detail);
    paper.setTool(e.detail);
  }

  onMount(() => {
    $undoStore = paper;
  });
</script>

<div class="main-paper-container">
  <Paper 
    editable={true} 
    manageKeyCache={true}
    page={$mainPage} 
    bind:this={paper}
    on:painterActive={onPainterActive}/>
</div>

{#if painterActive}
  <PainterToolBox on:setTool={onSetTool} on:done={onScribbleDone} bind:this={toolBox}/>
{/if}

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>