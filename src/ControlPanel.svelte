<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import TemplateChooser from './TemplateChooser.svelte';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from './NumberEdit.svelte';
  import './box.css';
  import { paperTemplate, paperWidth, paperHeight, paperColor, frameColor, frameWidth, saveToken, clipboardToken, importingImage } from './paperStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { FileDropzone } from '@skeletonlabs/skeleton';
  import { tick } from 'svelte';
  import { bodyDragging } from './uiStore';
  import { aboutOpen } from './aboutStore';
  import { postContact } from './firebase';
  import titleBarIcon from './assets/title-control-panel.png';
  import downloadIcon from './assets/get.png';
  import clipboardIcon from './assets/clipboard.png';
  import { SlideToggle } from '@skeletonlabs/skeleton';
  import { isJsonEditorOpen, downloadJsonToken, shareJsonToken } from './jsonEditorStore';
	import ColorPicker from 'svelte-awesome-color-picker';
  import { commitToken } from './undoStore';

  let min = 256;
  let max = 4096;
  let contactText = "";

  function setDimensions(w: number, h: number) {
    $paperWidth = w;
    $paperHeight = h;
  }

  function applyTemplate(event) {
    $paperTemplate = { frameTree: event.detail, bubbles: [] };
  }

  function save() {
    $saveToken = true;
  }

  function copyToClipboard() {
    $clipboardToken = true;
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});

  }

  let files: FileList;
  $: uploadImage(files);
  async function uploadImage(files: FileList) {
    if (files && files.length > 0) {
      const file = files[0];
      console.log(file.type)
      if (file.type.startsWith("image/")) {
        const imageBitmap = await createImageBitmap(file);
        setDimensions(imageBitmap.width, imageBitmap.height);
        $paperTemplate = { frameTree: {}, bubbles: [] };
        await tick();
        $importingImage = imageBitmap;
      } else if (file.type.startsWith("text/") || file.type.startsWith("application/json")) {
        const text = await readFileAsText(file);
        $paperTemplate = JSON.parse(text);
      }
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
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

  async function shareJson() {
    $commitToken = true;
    $shareJsonToken = true;
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

  function onDragOver(e) {
    e.preventDefault();
  }

  function onDrop(e) {
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
        <div class="font-bold slider-label">Width</div>
        <RangeSlider name="range-slider" bind:value={$paperWidth} min={min} max={max} step={1}/>
        <div class="text-xs slider-value-text">
          <div class="number-box"><NumberEdit bind:value={$paperWidth} showSlider={false}/></div>
           / {max}
        </div>
      </div>
      <div class="hbox">
        <div class="font-bold slider-label">Height</div>
        <RangeSlider name="range-slider" bind:value={$paperHeight} min={min} max={max} step={1}/>
        <div class="text-xs slider-value-text">
          <div class="number-box"><NumberEdit bind:value={$paperHeight} showSlider={false}/></div>
           / {max}
        </div>
      </div>
    </div>
    <div class="vbox space-around" style="width: 90px; height: 52px;">
      <div class="hbox gap">
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1680, 2376)}>A3</button>
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1456, 2056)}>B4</button>
      </div>
      <div class="hbox gap">
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(840, 1188)}>A4</button>
        <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(728, 1028)}>B5</button>
      </div>  
    </div>
  </div>
  <div class="hbox gap mx-2 paper-color-picker" style="margin-top: 16px;">
    背景色<ColorPicker bind:hex={$paperColor} label=""/>
    枠色<ColorPicker bind:hex={$frameColor} label="" />
    幅<RangeSlider name="line" bind:value={$frameWidth} max={10} step={1} style="width:100px;"/>
</div>
  <div class="hbox gap mx-2" style="margin-top: 16px;">
    <FileDropzone name="upload-file" accept="image/*" on:dragover={onDragOver} on:drop={onDrop} bind:files={files}>
    	<svelte:fragment slot="message">ここにpngをドロップすると一枚絵の用紙を作ります</svelte:fragment>
    </FileDropzone> 
  </div>  
  <div class="hbox gap" style="margin-top: 16px;">
    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 download-button hbox" on:click={save}>
      <img class="button-icon" src={downloadIcon} alt="download"/>ダウンロード
    </button>
    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 download-button hbox" on:click={copyToClipboard}>
      <img class="button-icon" src={clipboardIcon} alt="copy"/>コピー
    </button>
  </div>
  <div class="hbox mx-2" style="margin-top: 4px;">
    <textarea class="mx-2 my-2 rounded-container-token grow textarea" bind:value={contactText}></textarea>
    <button class="btn btn-sm variant-filled paper-size"  on:click={contact}>要望</button>
  </div>
  <div class="hbox gap mx-2" style="margin-top: 16px;">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button hbox" on:click={about}>
      About
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button hbox" on:click={toggleJsonEditor}>
      JSON Editor
    </button>
  </div>  
  <div class="hbox gap mx-2" style="margin-top: 16px;">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button hbox" on:click={downloadJson}>
      Download JSON
    </button>
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button hbox" on:click={shareJson}>
      Share
    </button>
  </div>  
</div>

<style>
  .control-panel {
    position: absolute;
    width: 400px;
    height: 690px;
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
  .labeled-component {
    display: flex;
    gap: 4px;
  }
  .slider-label {
    width: 55px;
  }
  .slider-value-text {
    width: 80px;
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
    width: 160px;
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
</style>
