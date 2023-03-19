<script type="ts">
  import { frameExamples } from './lib/layeredCanvas/frameExamples';
  import Paper from './Paper.svelte';

  let paperWidth = '840px';
  let paperHeight = '1180px';
  let frameJson = frameExamples[0];

</script>

<div class="main-paper-container">
  <Paper width={paperWidth} height={paperHeight} frameJson={frameJson} editable={true}/>
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