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
  import * as Sentry from "@sentry/svelte";
  import { Modal, modalStore } from '@skeletonlabs/skeleton';
  import type { ModalSettings, ModalComponent } from '@skeletonlabs/skeleton';   
  import Comic from './Comic.svelte'; 
  import FontChooser from './FontChooser.svelte';
  import ShapeChooser from './ShapeChooser.svelte';

  const modalComponentRegistry: Record<string, ModalComponent> = {
    comic: {
      ref: Comic,
    },
  };

  onMount(() => {
    document.body.style.overflow = 'hidden'; // HACK

    // Initialize the Sentry SDK here
    Sentry.init({
      dsn: "https://d1b647c536ab49979532e731e8bebaaa@o4505054668062721.ingest.sentry.io/4505054670159872",
      replaysSessionSampleRate: 0.1,
      // If the entire session is not sampled, use the below sample rate to sample
      // sessions when an error occurs.
      replaysOnErrorSampleRate: 1.0,

      integrations: [new Sentry.Replay()],
    });
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
  <!-- <canvas id="tmpCanvas" style="position:absolute;"> </canvas> -->
</div>

<BubbleInspector position={$bubbleInspectorPosition} bind:bubble={$bubble}/>
<FontChooser/>
<ShapeChooser paperWidth={64} paperHeight={96}/>

<JsonEditor/>

<About/>

<Toast/>

<Modal components={modalComponentRegistry} />
