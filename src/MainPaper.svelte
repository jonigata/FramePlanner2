<script type="ts">
  import { onMount, tick } from 'svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';
  import { paperTemplate, paperWidth, paperHeight, paperColor, frameColor, frameWidth, saveToken, clipboardToken, importingImage } from './paperStore';
  import { undoStore, commitToken } from './undoStore';
  import { jsonEditorInput, jsonEditorOutput } from './jsonEditorStore';
  import PainterToolBox from './PainterToolBox.svelte';

  $paperTemplate = { frameTree: frameExamples[0], bubbles:[] };

  let paper;
  let documentInput;
  let documentOutput;
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
    console.log('MainPaper.save', token);
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

  $:onInputDocument($jsonEditorInput);
  function onInputDocument(doc) {
    console.log("onInputDocument", doc);
    if (!doc) return;
    console.log(doc);
    setDocumentInput(doc);
  }

  $:onOutputDocument(documentOutput);
  function onOutputDocument(doc) {
    if (!doc) return;
    $jsonEditorOutput = doc;
  }

  $:onSetPaperTemplate($paperTemplate);
  function onSetPaperTemplate(template) {
    if (!template) return;
    if (template.characters && template.scenes) {
      pourScenario(template);
    } else {
      documentOutput = template;
      onOutputDocument(documentOutput);
      setDocumentInput(template);
    }
  }

  $:onCommitToken($commitToken);
  async function onCommitToken(token) {
    if (!token) return;
    console.log('tokenValue', token);
    paper.commit();
    $jsonEditorOutput = documentOutput; // かなりハック、なぜかdocumentOutputのりアクティブが飛んでこないので
    $commitToken = false;
  }


  function pourScenario(s) {
    paper.pourScenario(s);
  }

  function setDocumentInput(doc) {
    documentInput = doc;
    $paperColor = doc.frameTree.bgColor ?? 'white';
    $frameColor = doc.frameTree.borderColor ?? 'black';
    $frameWidth = doc.frameTree.borderWidth ?? 1;
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
    documentInput={documentInput} 
    paperColor={$paperColor} 
    frameColor={$frameColor} 
    frameWidth={$frameWidth} 
    editable={true} 
    manageKeyCache={true}
    bind:documentOutput={documentOutput} 
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
  .done-button {
    position: fixed;
    width: 240px;
    height: 80px;
    font-size: 32px;
    color: white;
    right: 32px;
    bottom: 32px;
  }
</style>