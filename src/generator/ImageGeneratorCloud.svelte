<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from '../gallery/Gallery.svelte';
  import { onlineAccount, onlineStatus } from "../utils/accountStore";
  import { onMount } from 'svelte';
  import Feathral from '../utils/Feathral.svelte';
  import { persistentText } from '../utils/persistentText';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import type { ImagingMode, ImagingProvider, ImagingBackground } from '$protocolTypes/imagingTypes';
  import { type ImagingContext, calculateCost, generateImage, modeOptions, isContentsPolicyViolationError } from '../utils/feathralImaging';
  import { toolTip } from '../utils/passiveToolTipStore';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import FluxModes from './FluxModes.svelte';
  import { ImageMedia, type Media } from "../lib/layeredCanvas/dataModels/media";
  import { _ } from 'svelte-i18n';

  import clipboardIcon from '../assets/clipboard.webp';
  import FeathralCost from '../utils/FeathralCost.svelte';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: Media[];
  export let chosen: Media | null;

  let progress = 0;
  let refered: Media | null= null;
  let postfix: string = "";
  let batchCount = 1;
  let mode: ImagingMode = "schnell";
  let width = 1024;
  let height = 1024;
  let estimatedCost = 0;
  let uiType: ImagingProvider;
  let sizeText = "1024x1024";
  let background: ImagingBackground = "opaque";

  function onChooseImage({detail}: CustomEvent<Media>) {
    chosen = detail;
  }

  $: onChangeMode(mode, sizeText);
  function onChangeMode(mode: ImagingMode, st: string) {
    uiType = modeOptions.find(m => m.value === mode)?.uiType;
    if (uiType == 'gpt-image-1') {
      width = st == "1536x1024" ? 1536 : 1024;
      height = st == "1024x1536" ? 1536 : 1024;
      console.log(width, height);
    }
  }

  async function generate() {
    if (mode == 'pro' && 1 < batchCount ) {
      toastStore.trigger({ message: $_('generator.proModeMultipleImagesNotSupported'), timeout: 2000 });
      batchCount = 1;
    }

    busy = true;
    let q: ReturnType<typeof setInterval> | undefined = undefined;
    try {
      progress = 0;
      let pixelRatio = width * height / 1024 / 1024;
      const factorTable: {[key in ImagingMode]: number}= {
        "schnell": 5,
        "pro": 12,
        "chibi": 12,
        "manga": 12,
        "comibg": 12,
        "gpt-image-1/low": 30,
        "gpt-image-1/medium": 30,
        "gpt-image-1/high": 30,
      }
      const delta = 1 / factorTable[mode] / pixelRatio;
      q = setInterval(() => {progress = Math.min(1.0, progress+delta);}, 1000);
      let imagingContext: ImagingContext = {
        awakeWarningToken: false,
        errorToken: false,
        total: 0,
        succeeded: 0,
        failed: 0,
      };

      const canvases = await executeProcessAndNotify(
        5000, $_('generator.imageGenerated'),
        async () => {
          return await generateImage(`${postfix}\n${prompt}`, {width,height}, mode, batchCount, background);
          // return { feathral: 99, result: { image: makePlainImage(imageRequest.width, imageRequest.height, "#00ff00ff") } };
        });
      gallery.push(...canvases.map(c => new ImageMedia(c)));
      gallery = gallery;

      progress = 1;
    }
    catch (e) {
      if (!isContentsPolicyViolationError(e)) {
        throw e;
      }
    }
    finally {
      clearInterval(q);
      busy = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(prompt);
    toastStore.trigger({ message: $_('generator.copiedToClipboard'), timeout: 1500});
  }

  $: estimatedCost = batchCount * calculateCost({width,height}, mode);

  onMount(async () => {
  });

</script>

<div class="drawer-content">
  {#if $onlineStatus === 'signed-in'}
  <p><Feathral/></p>

  <h2>{$_('generator.mode')}</h2>
  <div class="vbox left gap-2 mode">
    <FluxModes bind:mode={mode}/>
    <p>{$_('generator.costDisclaimer')}</p>
  </div>

  <h2>{$_('generator.style')}</h2>
  <textarea class="w-96 textarea" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  <h2>{$_('generator.prompt')}</h2>
  <div class="textarea-container">
    <textarea class="textarea h-32" bind:value={prompt}/>
    <div class="icon-container flex flex-row-reverse gap-2">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={clipboardIcon} alt={$_('generator.copyToClipboard')} on:click={copyToClipboard} use:toolTip={$_('generator.copyToClipboard')} />
    </div>
  </div>        

  <div class="hbox gap-5 mt-4">
    {#if uiType == 'flux'}
    <div class="hbox gap-5">
      <div class="vbox" style="width: 400px;">
        <SliderEdit label="width" bind:value={width} min={512} max={1536} step={128}/>
        <SliderEdit label="height" bind:value={height} min={512} max={1536} step={128}/>
      </div>
    </div>

    <div class="vbox">
      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/>
    </div>
    {/if}
    {#if uiType == 'gpt-image-1'}
      <select class="select h-8 p-0 w-64" bind:value={sizeText}>
        <option value="1024x1024">{$_('generator.square')}</option>
        <option value="1536x1024">{$_('generator.landscape')}</option>
        <option value="1024x1536">{$_('generator.portrait')}</option>
      </select>
      <select class="select h-8 p-0" bind:value={background}>
        <option value="opaque">{$_('generator.normalBackground')}</option>
        <option value="transparent">{$_('generator.transparentBackground')}</option>
      </select>

    {/if}
  </div>

  {#if $onlineAccount != null}   <!-- onMountの時点で明らかだがsvelteでは!が使えない -->
  <div class="flex flex-row gap-5 w-full items-center my-4 ">
    <button disabled={busy || $onlineAccount.feathral < 1} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      <div class="flex justify-center items-center h-6">
        {#if busy}
          <ProgressRadial stroke={220} meter="stroke-success-200" track="stroke-success-400" width="w-4"/>
        {:else}
          {$_('generator.generate')}
          <FeathralCost showsLabel={false} cost={estimatedCost} />
        {/if}
        </div>
    </button>
    {#if $onlineAccount.feathral < 1}
    <div class="warning">{$_('generator.notEnoughFeathral')}</div>
    {/if}

    <ProgressBar label="Progress Bar" value={progress} max={1} />
  </div>
  {/if}
  <Gallery columnWidth={220} bind:items={gallery} on:commit={onChooseImage} bind:refered={refered}/>
  {:else}
    <p>{$_('generator.pleaseSignIn')}</p>
  {/if}
</div>

<style>
  .drawer-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin: 16px;
  }
  textarea {
    align-self: stretch;
  }
  .generate-button {
    width: 160px;
  }
  .warning {
    color: #d22;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    display: flex;
    align-items: center;
    margin-top: 8px;
  }
  .textarea-container {
    position: relative;
    width: 100%;
  }
  .icon-container {
    position: absolute;
    right: 16px;
    top: -30px;
  }
  .icon-container img {
    width: 24px;
    height: 24px;
  }
  p {
    font-family: '源暎アンチック';
  }
</style>
