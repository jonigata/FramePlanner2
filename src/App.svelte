<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  //import '../app.postcss';  
  import ControlPanel from './ControlPanel.svelte';
  import BubbleDetail from './BubbleDetail.svelte';
  import MainPaper from './MainPaper.svelte';
</script>

<style>
  :global(body) {
    overflow: hidden;
  }

  .control-panel-container {
    position: absolute;
    top: 50%;
    left: 232px;
  }

</style>

<MainPaper></MainPaper>

<div class="control-panel-container">
  <ControlPanel />
  <BubbleDetail />
</div>
