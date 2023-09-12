<script type="ts">
  import { onMount } from 'svelte';
  import Paper from './Paper.svelte';
  import { saveToken, clipboardToken, importingImage } from './paperStore';
  import { undoStore, commitToken } from './undoStore';
  import { mainPage, revisionEqual } from './pageStore';
  import PainterToolBox from './PainterToolBox.svelte';

  let paper;
  let page = $mainPage;
  let currentRevision = $mainPage.revision;
  let painterActive = false;
  let toolBox = null;

  $:save($saveToken);
  function save(token) {
    if (!token) return;
    switch (token) {
      case 'download':
        paper.save();
        break;
      case 'aipictors':
        paper.postToAIPictors();
        break;
    }
    $saveToken = null;
  }

  $:copyToClipboard($clipboardToken);
  function copyToClipboard(token) {
    if (!token) return;
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
    paper.commit();
    $commitToken = false;
  }

  async function onPainterActive(e) {
    painterActive = e.detail;
  }

  function onScribbleDone() {
    paper.scribbleDone();
    painterActive = false;
  }

  function onSetTool(e) {
    paper.setTool(e.detail);
  }

  $:onInnerPageUpdate(page);
  function onInnerPageUpdate(p) {
    if (revisionEqual(p.revision, currentRevision)) {
      return;
    }

    currentRevision = {...p.revision};
    $mainPage = p;
  }

  $:onOuterPageUpdate($mainPage);
  function onOuterPageUpdate(p) {
    if (revisionEqual(p.revision, currentRevision)) {
      // console.log("revision equal");
      return;
    }

    console.log("onOuterPageUpdate");
    currentRevision = {...p.revision};
    page = p;
  }

  onMount(() => {
    $undoStore = paper;
  });
</script>

<div class="main-paper-container">
  <Paper 
    editable={true} 
    manageKeyCache={true}
    bind:page={page} 
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