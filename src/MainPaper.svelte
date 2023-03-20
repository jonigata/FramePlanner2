<script type="ts">
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';
  import { paperTemplate, paperWidth, paperHeight } from './paperStore.js';

  $paperTemplate = frameExamples[0];
</script>

<div class="main-paper-container">
  <Paper width={`${$paperWidth}px`} height={`${$paperHeight}px`} frameJson={$paperTemplate} editable={true}/>
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