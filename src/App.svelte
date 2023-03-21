<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  //import '../app.postcss';  
  import ControlPanel from './ControlPanel.svelte';
  import MainPaper from './MainPaper.svelte';
  import { Toast } from '@skeletonlabs/skeleton';
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
</div>

<Toast/>

