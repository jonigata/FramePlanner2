<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  //import '../app.postcss';  
  import ControlPanel from './ControlPanel.svelte';
</script>

<style>
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .control-panel-container {
    position: absolute;
    top: 50%;
    left: 50%;
  }

</style>

<canvas id="main-canvas"></canvas>

<div class="control-panel-container">
  <ControlPanel />
</div>
