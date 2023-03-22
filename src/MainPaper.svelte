<script type="ts">
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';
  import { paperTemplate, paperWidth, paperHeight, saveToken, clipboardToken, importingImage } from './paperStore';

  $paperTemplate = frameExamples[0];

  let paper;

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
</script>

<div class="main-paper-container">
  <Paper width={`${$paperWidth}px`} height={`${$paperHeight}px`} frameJson={$paperTemplate} editable={true} bind:this={paper}/>
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