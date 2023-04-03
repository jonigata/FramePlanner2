<script type="ts">
  import { onMount } from 'svelte';
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';
  import { paperTemplate, paperWidth, paperHeight, paperColor, frameColor, frameWidth, saveToken, clipboardToken, importingImage } from './paperStore';
  import { undoStore } from './undoStore';
  import { jsonEditorInput, jsonEditorOutput } from './jsonEditorStore';

  $paperTemplate = { frameTree: frameExamples[0], bubbles:[] };

  let paper;
  let documentInput;
  let documentOutput;

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
    documentInput = doc;
  }

  $:onOutputDocument(documentOutput);
  function onOutputDocument(doc) {
    console.log("onOutputDocument");
    if (!doc) return;
    console.log(doc);
    $jsonEditorOutput = doc;
  }

  $:onSetPaperTemplate($paperTemplate);
  function onSetPaperTemplate(template) {
    console.log("onSetPaperTemplate", template);
    if (!template) return;
    documentOutput = template;
    onOutputDocument(documentOutput);
    documentInput = template;
  }

  onMount(() => {
    $undoStore = paper;
  });
</script>

<div class="main-paper-container">
  <Paper 
    width={`${$paperWidth}px`} 
    height={`${$paperHeight}px`} 
    documentInput={documentInput} 
    paperColor={$paperColor} 
    frameColor={$frameColor} 
    frameWidth={$frameWidth} 
    editable={true} 
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