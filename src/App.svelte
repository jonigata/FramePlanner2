<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import { Toast } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { Modal, type ModalComponent } from '@skeletonlabs/skeleton';   
  import { copyIndexedDB } from './utils/backUpIndexedDB';
  import * as Sentry from "@sentry/svelte";

  //import '../app.postcss';  
  import ControlPanel from './controlpanel/ControlPanel.svelte';
  import BookEditor from './bookeditor/BookEditor.svelte';
  import PassiveToolTip from './utils/PassiveToolTip.svelte';
  import About from './about/About.svelte';
  import BubbleInspector from './bookeditor/bubbleinspector/BubbleInspector.svelte';
  import JsonEditor from './jsoneditor/JsonEditor.svelte';
  import Comic from './utils/Comic.svelte'; 
  import License from './utils/License.svelte';
  import FontChooser from './bookeditor/bubbleinspector/FontChooser.svelte';
  import ShapeChooser from './bookeditor/bubbleinspector/ShapeChooser.svelte';
  import ImageGenerator from './generator/ImageGenerator.svelte';
  import FileManager from './filemanager/FileManager.svelte';
  import NewBookButton from './rootelements/NewBookButton.svelte';
  import CabinetButton from './rootelements/CabinetButton.svelte';
  import Waiting from './utils/Waiting.svelte'
  import StoryWeaver from './weaver/StoryWeaver.svelte';
  import BatchImaging from './generator/BatchImaging.svelte';
  import BookArchiver from './utils/BookArchiver.svelte';

  const modalComponentRegistry: Record<string, ModalComponent> = {
    comic: {
      ref: Comic,
    },
    license: {
      ref: License,
    },
    waiting: {
      ref: Waiting,
    },
    weaver: {
      ref: StoryWeaver,
    },
  };

  onMount(async () => {
    document.body.style.overflow = 'hidden'; // HACK

    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLParams", urlParams);

    if (urlParams.has('saveFiles')) {
      const data: any = await copyIndexedDB('FileSystemDB');
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FileSystemDB.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    /*
    // Initialize the Sentry SDK here
    Sentry.init({
      dsn: "https://d1b647c536ab49979532e731e8bebaaa@o4505054668062721.ingest.sentry.io/4505054670159872",
      replaysSessionSampleRate: 0.1,
      // If the entire session is not sampled, use the below sample rate to sample
      // sessions when an error occurs.
      replaysOnErrorSampleRate: 1.0,

      integrations: [new Sentry.Replay()],
    });
  */
  });
</script>

<BookEditor />

<div class="control-panel-container">
  <ControlPanel />
  <PassiveToolTip />
  <NewBookButton  />
  <CabinetButton />
</div>

<BubbleInspector/>
<FontChooser/>
<ShapeChooser paperWidth={64} paperHeight={96}/>
<ImageGenerator/>
<FileManager/>

<JsonEditor/>

<About/>
<BatchImaging/>
<Toast/>
<BookArchiver/>

<Modal components={modalComponentRegistry} zIndex={'z-[500]'}/>

<style>
  :global(body) {
    overflow: hidden;
    height: 100vh;
    max-height: 100vh;
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

