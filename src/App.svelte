<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import { Toast } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { Modal, type ModalComponent } from '@skeletonlabs/skeleton';   
  import { copyIndexedDB } from './utils/backUpIndexedDB';
  import * as Sentry from "@sentry/svelte";
  import { Modals } from 'svelte-modals'
  import { mascotVisible } from './mascot/mascotStore';
  import { onlineAccount } from './utils/accountStore';
  import { developmentFlag } from "./utils/developmentFlagStore";

  //import '../app.postcss';  
  import ControlPanel from './controlpanel/ControlPanel.svelte';
  import BookEditor from './bookeditor/BookEditor.svelte';
  import PassiveToolTip from './utils/PassiveToolTip.svelte';
  import About from './about/About.svelte';
  import PageInspector from './bookeditor/pageinspector/PageInspector.svelte';
  import FrameInspector from './bookeditor/frameinspector/FrameInspector.svelte';
  import BubbleInspector from './bookeditor/bubbleinspector/BubbleInspector.svelte';
  import Comic from './utils/Comic.svelte'; 
  import License from './utils/License.svelte';
  import FontChooser from './bookeditor/bubbleinspector/FontChooser.svelte';
  import ShapeChooser from './bookeditor/bubbleinspector/ShapeChooser.svelte';
  import ImageGenerator from './generator/ImageGenerator.svelte';
  import FileManager from './filemanager/FileManager.svelte';
  import NewBookButton from './rootelements/NewBookButton.svelte';
  import CabinetButton from './rootelements/CabinetButton.svelte';
  import MaterialBucketButton from './rootelements/MaterialBucketButton.svelte';
  import BellButton from './rootelements/BellButton.svelte';
  import RulerButton from './rootelements/RulerButton.svelte';
  import AboutButton from './rootelements/AboutButton.svelte';
  import DownloadButton from './rootelements/DownloadButton.svelte';
  import VideoButton from './rootelements/VideoButton.svelte';
  import BatchImaging from './generator/BatchImaging.svelte';
  import BookArchiver from './utils/BookArchiver.svelte';
  import FileBrowser from './utils/FileBrowser.svelte';
  import FullScreenLoading from './utils/FullScreenLoading.svelte';
  import FontLoader from './bookeditor/FontLoader.svelte';
  import SignIn from './utils/SignIn.svelte';
  import Account from './utils/Account.svelte';
  import Mascot from './mascot/Mascot.svelte'
  import SaveOffButton from './rootelements/SaveOffButton.svelte';
  import DebugOnly from './utils/DebugOnly.svelte';
  import StructureTree from './about/StructureTree.svelte';
  import MaterialBucket from './materialBucket/MaterialBucket.svelte';
  import BubbleBucket from './bubbleBucket/BubbleBucket.svelte';
  //  import JsonReader from './utils/JsonReader.svelte';
  import VideoMaker from './videomaker/VideoMaker.svelte';
  import ToolBar from './toolbar/ToolBar.svelte'
  import AdContainer from './utils/ads/AdContainer.svelte';
  import Downloader from './downloader/Downloader.svelte';
  import TemplateChooser from './bookeditor/TemplateChooser.svelte';
  import ColorPickerDialog from './utils/colorpicker/ColorPickerDialog.svelte';
  import EffectChooser from './bookeditor/effectchooser/EffectChooser.svelte';
  import Notebook from './notebook/Notebook.svelte';

  const advertiser = "thumbnail_stories";
  //const advertiser = null;

  const modalComponentRegistry: Record<string, ModalComponent> = {
    comic: {
      ref: Comic,
    },
    license: {
      ref: License,
//      ref: JsonReader,
    },
    fileBrowser: {
      ref: FileBrowser,
    },
    signIn: {
      ref: SignIn,
    },
    videoMaker: {
      ref: VideoMaker,
    }
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

    // localhostか127.0.0.1だったら
    $developmentFlag = 
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    console.log("================ developmentFlag", $developmentFlag);

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

<div class="flex flex-col w-screen h-screen">
  <ToolBar/>
  <BookEditor />
</div>

<!-- dialogs -->
<ControlPanel />
<PageInspector/>
<FrameInspector/>
<BubbleInspector/>
{#if $mascotVisible && $onlineAccount != null}
  <Mascot/>
{/if}
<DebugOnly>
  <SaveOffButton/>
</DebugOnly>
<StructureTree/>
<MaterialBucket/>
<BubbleBucket/>
<Downloader/>
<ColorPickerDialog/>

<!-- root items -->
<MaterialBucketButton />
<NewBookButton  />
<CabinetButton />
{#if $onlineAccount != null}
  <BellButton />
{/if}
<RulerButton/>
<AboutButton/>
<DownloadButton />
<VideoButton />

<!-- drawers -->
<FontChooser/>
<ShapeChooser itemSize={[64, 96]}/>
<ImageGenerator/>
<FileManager/>
<About/>
<BatchImaging/>
<TemplateChooser/>
<EffectChooser/>
<Notebook/>

<!-- tools -->
<PassiveToolTip />
<Toast/>
<BookArchiver/>
<FontLoader/>
<Account/>

<!-- skeletonのModal -->
<Modal components={modalComponentRegistry} zIndex={'z-[500]'}/>

<!-- svelte-modals -->
<Modals>
  <div slot="backdrop" class="backdrop"/>
</Modals>
<FullScreenLoading/>

  <!-- ads -->
{#if advertiser != null}
  <AdContainer advertiser={advertiser}/>
{/if}

<style>

:global(body) {
    overflow: hidden;
    height: 100vh;
    max-height: 100vh;
  }

  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: rgba(0,0,0,0.50);
    z-index: 999;
  }
  
</style>

