<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  import TemplateChooser from './TemplateChooser.svelte';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from './NumberEdit.svelte';
  import './box.css';
  import { type Page, incrementRevision, mainPage, commitPage } from './pageStore';
  import { saveToken, clipboardToken, scale } from './paperStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { FileDropzone } from '@skeletonlabs/skeleton';
  import { bodyDragging } from './uiStore';
  import { aboutOpen } from './aboutStore';
  import { postContact } from './firebase';
  import titleBarIcon from './assets/title-control-panel.png';
  import downloadIcon from './assets/get.png';
  import clipboardIcon from './assets/clipboard.png';
  import { isJsonEditorOpen, downloadJsonToken } from './jsonEditorStore';
	import ColorPicker from 'svelte-awesome-color-picker';
  import { commitToken } from './undoStore';
  import ExponentialRangeSlider from './ExponentialRangeSlider.svelte';
  import aiPictorsIcon from './assets/aipictors_logo_0.png'
  import { FrameElement } from './lib/layeredCanvas/frameTree';
  import { Bubble } from './lib/layeredCanvas/bubble';
  import { newFileToken, newImagePage, sharePageToken } from './fileManagerStore';
  import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
  import { getAnalytics, logEvent } from "firebase/analytics";

  let min = 256;
  let exponentialMin = 4096;
  let max = 9410;
  let contactText = "";
  let paperSize: [number, number] = [0, 0];
  let paperColor: string = null;
  let frameColor: string = null;
  let frameWidth: number = 2;

  $:onUpdateMainPage($mainPage);
  function onUpdateMainPage(page: Page) {
    paperSize[0] = page.paperSize[0];
    paperSize[1] = page.paperSize[1];
    paperColor = page.paperColor;
    frameColor = page.frameColor;
    frameWidth = page.frameWidth;
  }

  $:onUpdatePaperProperty(paperSize, paperColor, frameColor, frameWidth);
  function onUpdatePaperProperty(_a: [number, number], _b: string, _c: string, _d: number) {
    const mp = $mainPage;
    if (mp.paperSize[0] === paperSize[0] && mp.paperSize[1] === paperSize[1] &&
        mp.paperColor === paperColor && mp.frameColor === frameColor && mp.frameWidth === frameWidth) {
      return;
    }
    console.log("ControlPanel.onUpdatePaperProperty");
    $mainPage.paperSize[0] = paperSize[0];
    $mainPage.paperSize[1] = paperSize[1];
    $mainPage.paperColor = paperColor;
    $mainPage.frameColor = frameColor;
    $mainPage.frameWidth = frameWidth;
    $mainPage.revision = incrementRevision($mainPage.revision);
  }

  function setDimensions(w: number, h: number) {
    // 入れ物ごと交換するとbindが崩れる模様
    paperSize[0] = w;
    paperSize[1] = h;
  }

  function applyTemplate(event: CustomEvent<any>) {
    const page = {...$mainPage};
    page.frameTree = FrameElement.compile(event.detail);
    page.bubbles = [];
    page.revision = incrementRevision(page.revision);
    page.paperColor = page.frameTree.bgColor;
    $mainPage = commitPage(page, page.frameTree, page.bubbles, null);
  }

  function save() {
    logEvent(getAnalytics(), 'download');
    $saveToken = "download";
  }

  function postAIPictors() {
    logEvent(getAnalytics(), 'post_to_aipictors');
    $saveToken = "aipictors";
  }

  function copyToClipboard() {
    logEvent(getAnalytics(), 'copy_to_clipboard');
    $clipboardToken = true;
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});

  }

  function openStoryWeaver() {
    const d: ModalSettings = {
      type: 'component',
      component: 'weaver',
    };
    modalStore.trigger(d);    
  }

  let files: FileList;
  $: uploadImage(files);
  async function uploadImage(files: FileList) {
    if (files && files.length > 0) {
      const file = files[0];
      console.log(file.type)
      if (file.type.startsWith("image/")) {
        const imageURL = URL.createObjectURL(file); 
        const image = new Image();

        const imageLoaded = new Promise((resolve) => image.onload = resolve);          
        image.src = imageURL;
        await imageLoaded;
        URL.revokeObjectURL(imageURL); // オブジェクトURLのリソースを解放

        const page = newImagePage(image, "drop-")
        $newFileToken = page;
      } else if (file.type.startsWith("text/") || file.type.startsWith("application/json")) {
        const text = await readFileAsText(file);
        const json = JSON.parse(text);
        $mainPage.frameTree = FrameElement.compile(json.frameTree);
        $mainPage.bubbles = json.bubbles.map((b: Bubble) => Bubble.compile($mainPage.paperSize, b));
      }
    }
  }

  function readFileAsText(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function about() {
    console.log("about");
    $aboutOpen = true;
  }

  function toggleJsonEditor() {
    console.log("openJsonEditor");
    $isJsonEditorOpen = !$isJsonEditorOpen;      
  }

  async function downloadJson() {
    $commitToken = true;
    $downloadJsonToken = true;
  }

  async function sharePage() {
    $commitToken = true;
    $sharePageToken = $mainPage;
  }

  async function contact() {
    console.log(contactText);
    if (contactText == null || contactText == "") {
      toastStore.trigger({ message: '要望を入力してください', timeout: 1500});
      return;
    }
    if (contactText === "throw error") {
      throw new Error("intentional error");
    }
    await postContact(contactText);
    toastStore.trigger({ message: '要望を投稿しました', timeout: 1500});
    contactText = null;
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    files = e.dataTransfer.files;
  }

</script>

<div class="control-panel variant-glass-surface rounded-container-token" use:draggable={{ handle: '.title-bar' }} style="pointer-events: {$bodyDragging ? 'none' : 'auto'};">
  <div class="title-bar variant-filled-surface rounded-container-token"><img class="title-image" src={titleBarIcon} alt="title"/></div>
  <div class="px-2">
    <TemplateChooser on:apply={applyTemplate} />
  </div>
  <div class="hbox space-around canvas-size-container">
    <div class="vbox expand">
      <div class="hbox">
        <div class="font-bold slider-label">W</div>
        <div style="width: 140px;">
          <ExponentialRangeSlider name="range-slider" bind:value={paperSize[0]} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={1000} powPerStep={0.0001} step={1}/>
        </div>
        <div class="text-xs slider-value-text hbox gap-0.5">
          <div class="number-box"><NumberEdit bind:value={paperSize[0]}/></div>
          / {max}
        </div>
      </div>
      <div class="hbox">
        <div class="font-bold slider-label">H</div>
        <div style="width: 140px;">
          <ExponentialRangeSlider name="range-slider" bind:value={paperSize[1]} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={1000} powPerStep={0.0001} step={1}/>
        </div>
        <div class="text-xs slider-value-text hbox gap-0.5">
          <div class="number-box"><NumberEdit bind:value={paperSize[1]}/></div>
           / {max}
        </div>
      </div>
    </div>
    <div class="vbox space-around" style="width: 90px; height: 52px;">
      <div class="hbox gap-0.5">
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1024, 1024)}>S2</button>
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1680, 2376)}>A3</button>
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1456, 2056)}>B4</button>
      </div>
      <div class="hbox gap-0.5">
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(512, 512)}>S1</button>
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(840, 1188)}>A4</button>
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(728, 1028)}>B5</button>
      </div>  
    </div>
  </div>
  <div class="hbox gap mx-2 paper-color-picker">
    背景色<ColorPicker bind:hex={paperColor} label=""/>
    枠色<ColorPicker bind:hex={frameColor} label="" />
    幅<RangeSlider name="line" bind:value={frameWidth} max={10} step={1} style="width:100px;"/>
  </div>
  <div class="hbox gap" style="margin-top: 16px;">
    拡大率<RangeSlider name="scale" bind:value={$scale} min={0.1} max={10} step={0.01} style="width:250px;"/>
    <button class="btn btn-sm variant-filled paper-size" on:click={() => $scale=1}>100%</button>
  </div>
  <div class="hbox gap mx-2" style="margin-top: 16px;">
    <FileDropzone name="upload-file" accept="image/*" on:dragover={onDragOver} on:drop={onDrop} bind:files={files}>
    	<svelte:fragment slot="message">ここにpngをドロップすると一枚絵の用紙を作ります</svelte:fragment>
    </FileDropzone> 
  </div>  
  <div class="variant-soft-tertiary mt-2 mx-2 p-2 pt-0 rounded-container-token">
    出版！
    <div class="hbox mx-2 gap">
      <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 download-button hbox" on:click={save}>
        <img class="button-icon" src={downloadIcon} alt="download"/>ダウンロード
      </button>
      <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 download-button hbox" on:click={copyToClipboard}>
        <img class="button-icon" src={clipboardIcon} alt="copy"/>コピー
      </button>
      <button class="bg-slate-50 text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 download-button hbox" on:click={postAIPictors}>
        <img width="95%" src={aiPictorsIcon} alt="aipictors"/>
      </button>
    </div>
  </div>
  <div class="hbox mx-2" style="margin-top: 4px;">
    <textarea class="mx-2 my-2 rounded-container-token grow textarea" bind:value={contactText}></textarea>
    <button class="btn btn-sm variant-filled paper-size"  on:click={contact}>要望</button>
  </div>
  <div class="hbox gap mx-2" style="margin-top: 0px;">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={about}>
      About
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={toggleJsonEditor}>
      JSON Editor
    </button>
  </div>  
  <div class="hbox gap mx-2" style="margin-top: 8px;">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={downloadJson}>
      Download JSON
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={sharePage}>
      Share
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={openStoryWeaver}>
      Weaver
    </button>
  </div>  
</div>

<style>
  .control-panel {
    position: absolute;
    width: 400px;
    height: 710px;
    display: flex;
    flex-direction: column;
    top: 20px;
    left: 20px;
  }
  .title-bar {
    cursor: move;
    padding: 2px;
    margin: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .title-image {
    width: 32px;
    height: 32px;
  }
  .slider-label {
    width: 20px;
  }
  .slider-value-text {
    width: 76px;
    text-align: right;
  }
  .canvas-size-container {
    margin-right: 16px;
    margin-top: 4px;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
  }
  .paper-size {
    height: 20px;
  }
  .download-button {
    width: 125px;
    height: 35px;
  }
  .button-icon {
    width: 32px;
    height: 32px;
  }
  .textarea {
    resize: none;
  }
  .paper-color-picker :global(.container .color) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .paper-color-picker :global(.container .alpha) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .function-button {
    width: 125px;
  }
</style>
