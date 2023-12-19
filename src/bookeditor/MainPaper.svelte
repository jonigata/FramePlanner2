<script lang="ts">
  import { onMount } from 'svelte';
  import Paper from './Paper.svelte';
  import { saveToken, clipboardToken, redrawToken, scale } from './paperStore';
  import { undoStore, commitIfDirtyToken, commitToken } from './undoStore';
  import { type Page, mainPage, revisionEqual } from './pageStore';
  import PainterToolBox from './painter/PainterToolBox.svelte';
  import { imageGeneratorTarget } from './generator/imageGeneratorStore';
  import type { FrameElement } from './lib/layeredCanvas/dataModels/frameTree';
  import PainterAutoGenerate from './painter/PainterAutoGenerate.svelte';
  import KeyValueStorage from "./utils/KeyValueStorage.svelte";
  import { saveAsPSD } from './utils/saveAsPSD';

  let paper: Paper;
  let page = $mainPage;
  let currentRevision = $mainPage.revision;
  let painterActive = false;
  let painterElement = null;
  let painterAutoGenerate = null;
  let keyValueStorage: KeyValueStorage = null;

  let url: string = "http://192.168.68.111:7860";
  let autoGeneration;
  let lcm;
  let changeTimer = null;

  $: if ($redrawToken) { paper.redraw(); $redrawToken = false; }

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
      case 'psd':
        saveAsPSD($mainPage);
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

  $: onChangeSettings([painterElement?.prompt, lcm, autoGeneration]);
  function onChangeSettings(_dummy) {
    console.log("onAutoGenerate");
    if (changeTimer) { clearTimeout(changeTimer); }
    changeTimer = setTimeout(() => {
      onAutoGenerate(null);
    }, 1000);
  }

  $: changeAutoGeneration(autoGeneration);
  function changeAutoGeneration(f) {
    paper?.setScribbleBackground(f);
  }

  function onModalGenerate(e: CustomEvent) {
    $imageGeneratorTarget = e.detail;
  }

  async function onModalScribble(e: CustomEvent<FrameElement>) {
    console.log("onModalScribble")
    painterActive = true;
    painterElement = e.detail;
    paper.setScribbleBackground(autoGeneration);
    paper.scribbleStart(painterElement);
  }

  function onScribbleDone() {
    console.log("onScribbleDone")
    paper.scribbleDone();
    painterActive = false;
  }

  function onSetTool(e: CustomEvent<any>) {
    paper.setTool(e.detail);
  }

  function onAutoGenerate(e_: CustomEvent) {
    if (!painterAutoGenerate) { return; }
    painterAutoGenerate.doScribble(
      autoGeneration,
      url,
      painterElement.scribble,
      painterElement.prompt,
      lcm,
      painterElement.image);
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

  let targetFrameElement = null;
  let oldPrompt = '';
  let oldImage = null;
  imageGeneratorTarget.subscribe(
    (target) => {
      console.log("imageGeneratorTarget", target, targetFrameElement);
      if (target && !targetFrameElement) {
        targetFrameElement = target;
        oldPrompt = targetFrameElement.positive;
        oldImage = targetFrameElement.image;
      } else if (targetFrameElement) {
        if (targetFrameElement.image !== oldImage) {
          console.log("image changed");
          paper.constraintElement(targetFrameElement, true);
        }
        if (targetFrameElement.positive !== oldPrompt ||
            targetFrameElement.image !== oldImage) {
          console.log("imageGeneration commit");
          paper.commit(null);
        }
        targetFrameElement = null;
        $redrawToken = true;
      }
    });

  onMount(async () => {
    await keyValueStorage.waitForReady();
    url = await keyValueStorage.get("url") ?? url;

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
    on:modalGenerate={onModalGenerate}
    on:modalScribble={onModalScribble}
    on:autoGenerate={onAutoGenerate}
    />
</div>

{#if painterActive}
  <PainterToolBox on:setTool={onSetTool} on:done={onScribbleDone} on:redraw={onAutoGenerate} bind:element={painterElement} bind:autoGeneration={autoGeneration} bind:lcm={lcm}/>
  <PainterAutoGenerate bind:this={painterAutoGenerate}/>
{/if}

<KeyValueStorage bind:this={keyValueStorage} dbName={"stable-diffusion"} storeName={"default-parameters"}/>

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>