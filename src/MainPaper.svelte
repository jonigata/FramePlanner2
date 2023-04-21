<script type="ts">
  import { onMount } from 'svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';
  import { paperTemplate, paperWidth, paperHeight, paperColor, frameColor, frameWidth, saveToken, clipboardToken, importingImage } from './paperStore';
  import { undoStore, commitToken } from './undoStore';
  import { jsonEditorInput, jsonEditorOutput } from './jsonEditorStore';

  $paperTemplate = { frameTree: frameExamples[0], bubbles:[] };

  let paper;
  let documentInput;
  let documentOutput;
  let width;
  let height;

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
    documentOutput = template;
    onOutputDocument(documentOutput);
    setDocumentInput(template);
  }

  $:onCommitToken($commitToken);
  async function onCommitToken(token) {
    if (!token) return;
    console.log('tokenValue', token);
    paper.commit();
    $jsonEditorOutput = documentOutput; // かなりハック、なぜかdocumentOutputのりアクティブが飛んでこないので
    $commitToken = false;
  }

  function setDocumentInput(doc) {
    documentInput = doc;
    $paperColor = doc.frameTree.bgColor ?? 'white';
    $frameColor = doc.frameTree.borderColor ?? 'black';
    $frameWidth = doc.frameTree.borderWidth ?? 1;
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
    bind:this={paper}/>
</div>

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>