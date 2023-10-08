<script type="ts">
  import { onMount } from 'svelte';
  import Paper from './Paper.svelte';
  import { saveToken, clipboardToken } from './paperStore';
  import { undoStore, commitToken } from './undoStore';
  import { type Page, mainPage, revisionEqual } from './pageStore';
  import PainterToolBox from './PainterToolBox.svelte';

  let paper: Paper;
  let page = $mainPage;
  let currentRevision = $mainPage.revision;
  let painterActive = false;

  $:save($saveToken);
  function save(token: string) {
    if (!token) return;
    switch (token) {
      case 'download':
        paper.save();
        break;
      case 'aipictors':
        paper.postToSNS();
        break;
    }
    $saveToken = null;
  }

  $:copyToClipboard($clipboardToken);
  function copyToClipboard(token: boolean) {
    if (!token) return;
    paper.copyToClipboard();
    $clipboardToken = false;
  }

  $:onCommitToken($commitToken);
  async function onCommitToken(token: boolean) {
    if (!token) return;
    paper.commitIfDirty();
    $commitToken = false;
  }

  async function onPainterActive(e: CustomEvent<boolean>) {
    painterActive = e.detail;
  }

  function onScribbleDone() {
    paper.scribbleDone();
    painterActive = false;
  }

  function onSetTool(e: CustomEvent<any>) {
    paper.setTool(e.detail);
  }

  $:onInnerPageUpdate(page);
  function onInnerPageUpdate(p: Page) {
    if (revisionEqual(p.revision, currentRevision)) {
      return;
    }

    currentRevision = {...p.revision};
    $mainPage = p;
  }

  $:onOuterPageUpdate($mainPage);
  function onOuterPageUpdate(p: Page) {
    if (revisionEqual(p.revision, currentRevision)) {
      // console.log("revision equal");
      return;
    }

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
  <PainterToolBox on:setTool={onSetTool} on:done={onScribbleDone}/>
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