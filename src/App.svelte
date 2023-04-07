<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';
  //import '../app.postcss';  
  import ControlPanel from './ControlPanel.svelte';
  import MainPaper from './MainPaper.svelte';
  import { Toast } from '@skeletonlabs/skeleton';
  import PassiveToolTip from './PassiveToolTip.svelte';
  import About from './About.svelte';
  import BubbleInspector from './BubbleInspector.svelte';
  import { bubble, bubbleInspectorPosition } from './bubbleInspectorStore';
  import JsonEditor from './JsonEditor.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    document.body.style.overflow = 'hidden'; // HACK
  });
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

<MainPaper/>

<div class="control-panel-container">
  <ControlPanel />
  <PassiveToolTip />
</div>

<BubbleInspector position={$bubbleInspectorPosition} bind:bubble={$bubble}/>

<JsonEditor/>

<About/>

<Toast/>

