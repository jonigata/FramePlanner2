<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  //import '../app.postcss';  
  import ControlPanel from './ControlPanel.svelte';
  import MainPaper from './MainPaper.svelte';
  import { Toast } from '@skeletonlabs/skeleton';
  import BodyDrag from './BodyDrag.svelte';
  import PassiveToolTip from './PassiveToolTip.svelte';
  import About from './About.svelte';
  import BubbleInspector from './BubbleInspector.svelte';
  import { bubble, bubbleInspectorPosition } from './bubbleInspectorStore';
</script>

<style>
  :global(body) {
    overflow: hidden;
  }

  .control-panel-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

</style>

<BodyDrag>
  <MainPaper/>
</BodyDrag>

<div class="control-panel-container">
  <ControlPanel />
  <PassiveToolTip />
</div>

<BubbleInspector isOpen={$bubble} position={$bubbleInspectorPosition} bind:bubble={$bubble}/>

<About/>

<Toast/>

