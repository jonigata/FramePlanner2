<script lang="ts">
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
  import '@skeletonlabs/skeleton/styles/all.css';

  import { Toast } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { Modal, type ModalComponent } from '@skeletonlabs/skeleton';   
  import { copyIndexedDB } from './utils/backUpIndexedDB';
  import * as Sentry from "@sentry/svelte";
  import { Modals } from 'svelte-modals'
  import { bootstrap, onlineStatus } from './utils/accountStore';
  import { developmentFlag } from "./utils/developmentFlagStore";
  import { getPreferencePromise } from './preferences';
  import { dominantMode } from './uiStore'
  
  //import '../app.postcss';  
  import ControlPanel from './controlpanel/ControlPanel.svelte';
  import BookEditor from './bookeditor/BookWorkspace.svelte';
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
  import PostButton from './rootelements/PostButton.svelte';
  import BatchImaging from './generator/BatchImaging.svelte';
  import BookArchiver from './utils/BookArchiver.svelte';
  import FileBrowser from './utils/FileBrowser.svelte';
  import FullScreenLoading from './utils/FullScreenLoading.svelte';
  import FullScreenProgress from './utils/FullScreenProgress.svelte';
  import SaveOffButton from './rootelements/SaveOffButton.svelte';
  import JumpButton from './rootelements/JumpButton.svelte';
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
  import MediaViewer from './gallery/MediaViewer.svelte';
  import UserProfile from './toolbar/UserProfile.svelte';
  import Publication from './publication/Publication.svelte';
  import AuthForm from './utils/AuthForm.svelte';
  import SocialCard from './publication/SocialCard.svelte';
  import Roster from './notebook/Roster.svelte';
  import VideoGenerator from './generator/VideoGenerator.svelte';
  import ImageMaskDialog from './utils/ImageMaskDialog.svelte';
  import InpaintDialog from './utils/InpaintDialog.svelte';
  import TextEditDialog from './utils/TextEditDialog.svelte';
  import Upscaler from './generator/Upscaler.svelte';
  import Dump from './transfer/Dump.svelte';
  import Undump from './transfer/Undump.svelte';
  import CanvasBrowser from './utils/CanvasBrowser.svelte';
  import NewStorageWizard from './filemanager/NewStorageWizard.svelte';
  import ConfirmDialog from './utils/ConfirmDialog.svelte';

  //const advertiser = "thumbnail_stories";
  const advertiser = null;

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
    videoMaker: {
      ref: VideoMaker,
    },
    mediaViewer: {
      ref: MediaViewer,
    },
    userProfile: {
      ref: UserProfile,
    },
    publication: {
      ref: Publication,
    },
    auth: {
      ref: AuthForm,
    },
    socialCard: {
      ref: SocialCard,
    },
    videoGenerator: {
      ref: VideoGenerator,
    },
    imageMask: {
      ref: ImageMaskDialog,
    },
    inpaint: {
      ref: InpaintDialog,
    },
    textedit: {
      ref: TextEditDialog,
    },
    upscaler: {
      ref: Upscaler,
    },
    dump: {
      ref: Dump
    },
    undump: {
      ref: Undump
    },
    canvasBrowser: {
      ref: CanvasBrowser
    },
    newStorageWizard: {
      ref: NewStorageWizard
    },
    confirm: {
      ref: ConfirmDialog,
    }
  };

  let fileManagerActive = false;

  onMount(async () => {
    document.body.style.overflow = 'hidden'; // HACK

    bootstrap();

    const urlParams = new URLSearchParams(window.location.search);

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

    if (!urlParams.has('disableFileManager')) {
      fileManagerActive = true;
    }

    // Initialize the Sentry SDK here
    if ($developmentFlag) {
      console.log("ignore sentry because this is development mode.");
    } else {
      const res = await fetch("/stamp.txt");
      const text = await res.text();
      const stamp = text.split("\n")[0].trim();
      Sentry.init({
        dsn: "https://d1b647c536ab49979532e731e8bebaaa@o4505054668062721.ingest.sentry.io/4505054670159872",
        replaysSessionSampleRate: 0.1,
        // If the entire session is not sampled, use the below sample rate to sample
        // sessions when an error occurs.
        replaysOnErrorSampleRate: 1.0,
        ignoreErrors: ['WebGPU is not supported on this browser','No appropriate GPUAdapter found'],
        release: stamp,
      });
    }
  });
</script>

<div class="flex flex-col w-screen h-screen">
  <ToolBar/>
  <div class="flex-grow relative">
    <BookEditor />

    <!-- root items -->
    {#if $dominantMode === "standard"}
      <MaterialBucketButton />
      <NewBookButton  />
      <CabinetButton />
      <JumpButton />
      <BellButton />
      <RulerButton/>
      <AboutButton/>
      <DownloadButton />
      <VideoButton />
      <PostButton />
      <DebugOnly>
        <SaveOffButton/>
      </DebugOnly>
    {/if}
  </div>
</div>

<!-- dialogs -->
<ControlPanel/>
<PageInspector/>
<FrameInspector/>
<BubbleInspector/>
<StructureTree/>
<MaterialBucket/>
<BubbleBucket/>
<Downloader/>
<ColorPickerDialog/>

<!-- drawers -->
<!-- 
  順序に意味があるので注意(後ろほど上に来る)
  例えばRosterはNotebookの上にないといけない
-->
<FontChooser/>
<ShapeChooser itemSize={[64, 96]}/>
<ImageGenerator/>
{#await getPreferencePromise() then p}
  {#if fileManagerActive}
    <FileManager/>
  {/if}
{/await}
<About/>
<BatchImaging/>
<TemplateChooser/>
<EffectChooser/>
<Notebook/>
<Roster/>

<!-- tools -->
<PassiveToolTip />
<Toast zIndex={"z-[1001]"}/>
<BookArchiver/>

<!-- skeletonのModal -->
<Modal components={modalComponentRegistry} zIndex={'z-[500]'}/>

<!-- svelte-modals -->
<Modals>
  <div slot="backdrop" class="backdrop"/>
</Modals>
<FullScreenLoading/>
<FullScreenProgress/>

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

