<script lang="ts">
  import { onMount } from 'svelte';
  import Paper from './Paper.svelte';
  import { saveToken, clipboardToken, redrawToken, scale } from './paperStore';
  import { undoStore, commitIfDirtyToken, commitToken } from './undoStore';
  import { type Page, mainPage, revisionEqual } from './pageStore';
  import { frameImageGeneratorTarget } from "./frameImageGeneratorStore";
  import PainterToolBox from './PainterToolBox.svelte';
  import { imageGeneratorChosen, imageGeneratorOpen, imageGeneratorPrompt, imageGeneratorGallery } from './imageGeneratorStore';

  let paper: Paper;
  let page = $mainPage;
  let currentRevision = $mainPage.revision;
  let painterActive = false;

  $: if ($redrawToken) { paper.redraw(); }

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

  $: if ($commitIfDirtyToken) {
    paper.commitIfDirty();
    $commitIfDirtyToken = false;
  }

  $: if($commitToken) {
    paper.commit($commitToken);
    $commitToken = false;
  }

  async function onPainterActive(e: CustomEvent<boolean>) {
    painterActive = e.detail;
  }

  function onGenerate(e: CustomEvent) {
    $frameImageGeneratorTarget = e.detail;
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

  frameImageGeneratorTarget.subscribe(
    (target) => {
      if (target) {
        imageGeneratorPrompt.set(target.prompt);
        imageGeneratorGallery.set(target.gallery);
        imageGeneratorOpen.set(true);
      }
    });

  imageGeneratorChosen.subscribe(
    (chosen) => {
      if (chosen) {
        imageGeneratorOpen.set(false);
        imageGeneratorChosen.set(null);
        $frameImageGeneratorTarget.image = chosen;
        paper.constraintElement($frameImageGeneratorTarget, true);
        paper.commit(null);
        $redrawToken = true;
      }
    });


  onMount(() => {
    $undoStore = paper;
  });
</script>

<div class="main-paper-container">
  <Paper 
    editable={true} 
    manageKeyCache={true}
    bind:page={page} 
    bind:scale={$scale}
    bind:this={paper}
    on:painterActive={onPainterActive}
    on:generate={onGenerate}
    />
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