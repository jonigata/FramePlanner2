<script type="ts">
  import { onMount, tick } from 'svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';
  import { paperTemplate, paperWidth, paperHeight, paperColor, frameColor, frameWidth, saveToken, clipboardToken, importingImage } from './paperStore';
  import { undoStore, commitToken } from './undoStore';
  import { mainPage } from './pageStore';
  import PainterToolBox from './PainterToolBox.svelte';

  $paperTemplate = { frameTree: frameExamples[0], bubbles:[] };

  let paper;
  let page; // 子のPaperが持ってるmodelの参照
  let pageRevision = 0;
  let width;
  let height;
  let painterActive = false;
  let toolBox = null;

  $:onChangePaperSize($paperWidth, $paperHeight);
  function onChangePaperSize(w, h) {
    if (!w || !h) return;
    if (w < 256 || h < 256) return;
    console.log('onChangePaperSize', w, h);
    width = w;
    height = h;
  }

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

  $:onUpdateOuterPage($mainPage);
  function onUpdateOuterPage(newPage) {
    console.log("onUpdateOuterPage", newPage);
    if (!newPage) return;
    if (newPage.revision <= pageRevision) return;
    setPage(newPage);
  }

  $:onUpdateInnerPage(page);
  function onUpdateInnerPage(newPage) {
    console.log("onUpdateInnerPage", newPage);
    if (!newPage) return;
    if (newPage.revision <= pageRevision) return;
    $mainPage = newPage;
  }

  $:onSetPaperTemplate($paperTemplate);
  function onSetPaperTemplate(template) {
    if (!template) return;
    if (template.characters && template.scenes) {
      pourScenario(template);
    } else {
      pageRevision++;
      page = {...template, revision: pageRevision};
      $mainPage = page;
      setPage(page);
    }
  }

  $:onCommitToken($commitToken);
  async function onCommitToken(token) {
    if (!token) return;
    console.log('tokenValue', token);
    paper.commit();
    // $jsonEditorOutput = documentOutput; // かなりハック、なぜかdocumentOutputのりアクティブが飛んでこないので // TODO: ここ注意
    $mainPage = page;
    $commitToken = false;
  }


  function pourScenario(s) {
    paper.pourScenario(s);
  }

  function setPage(newPage) {
    // TODO: 最終的にpaperColor/frameColor/frameWidthはPageに含めればこの関数不要では
    page = newPage;
    $paperColor = page.frameTree.bgColor ?? 'white';
    $frameColor = page.frameTree.borderColor ?? 'black';
    $frameWidth = page.frameTree.borderWidth ?? 1;
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
    bind:width={width}
    bind:height={height}
    paperColor={$paperColor} 
    frameColor={$frameColor} 
    frameWidth={$frameWidth} 
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