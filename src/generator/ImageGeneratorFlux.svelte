<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import { onlineAccount, onlineStatus } from "../utils/accountStore";
  import { onMount } from 'svelte';
  import { getFeathral } from '../firebase';
  import { getAnalytics, logEvent } from "firebase/analytics";
  import Feathral from '../utils/Feathral.svelte';
  import { persistentText } from '../utils/persistentText';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { createCanvasFromImage } from '../lib/layeredCanvas/tools/imageUtil';
  import { type ImagingContext, type Mode, calculateCost, generateFluxImage } from '../utils/feathralImaging';
  import { toolTip } from '../utils/passiveToolTipStore';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import FluxModes from './FluxModes.svelte';

  import clipboardIcon from '../assets/clipboard.png';
  import FeathralCost from '../utils/FeathralCost.svelte';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: HTMLCanvasElement[];
  export let chosen: HTMLCanvasElement | null;

  let progress = 0;
  let refered: HTMLCanvasElement | null= null;
  let postfix: string = "";
  let batchCount = 1;
  let mode: Mode = "schnell";
  let width = 1024;
  let height = 1024;
  let estimatedCost = 0;

  function onChooseImage({detail}: CustomEvent<HTMLCanvasElement>) {
    chosen = detail;
  }

  async function generate() {
    if (mode == 'pro' && 1 < batchCount ) {
      toastStore.trigger({ message: 'Proモードでは現在複数枚指定できません', timeout: 2000 });
      batchCount = 1;
    }

    busy = true;
    let q: ReturnType<typeof setInterval> | undefined = undefined;
    try {
      progress = 0;
      let pixelRatio = width * height / 1024 / 1024;
      const factorTable = {
        "schnell": 5,
        "pro": 12,
        "chibi": 12,
        "manga": 12,
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

      const result = await executeProcessAndNotify(
        5000, "画像が生成されました",
        async () => {
          return await generateFluxImage(`${postfix}\n${prompt}`, {width,height}, mode, batchCount, imagingContext);
          // return { feathral: 99, result: { image: makePlainImage(imageRequest.width, imageRequest.height, "#00ff00ff") } };
        });
      if (result == null) {
        return;
      }

      const promises = [];
      for (let i = 0; i < result.images.length; i++) {
        promises.push(result.images[i].decode());
      }
      await Promise.all(promises);
      
      const canvases = [];
      for (let i = 0; i < result.images.length; i++) {
        canvases.push(createCanvasFromImage(result.images[i]));
      }

      gallery.push(...canvases);
      gallery = gallery;
      progress = 1;

      logEvent(getAnalytics(), 'generate_flux');

      $onlineAccount!.feathral = result.feathral;
    }
    finally {
      clearInterval(q);
      busy = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(prompt);
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});
  }

  $: estimatedCost = batchCount * calculateCost({width,height}, mode);

  onMount(async () => {
    $onlineAccount!.feathral = await getFeathral();
    console.log($onlineAccount!.feathral);
  });

</script>

<div class="drawer-content">
  {#if $onlineStatus === 'signed-in'}
  <p><Feathral/></p>

  <h2>モード</h2>
  <div class="vbox left gap-2 mode">
    <FluxModes bind:mode={mode}/>
  </div>

  <h2>スタイル</h2>
  <textarea class="w-96 textarea" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  <h2>プロンプト</h2>
  <div class="textarea-container">
    <textarea class="textarea h-32" bind:value={prompt}/>
    <div class="icon-container flex flex-row-reverse gap-2">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={clipboardIcon} alt="クリップボードにコピー" on:click={copyToClipboard} use:toolTip={"クリップボードにコピー"} />
    </div>
  </div>        
<!--
  <p>negative prompt</p>
  <textarea bind:value={imageRequest.negative_prompt}/>
-->

  <div class="hbox gap-5 mt-4">
<!--
    <div class="vbox" style="width: 400px;">
      <SliderEdit label="width" bind:value={imageRequest.width} min={512} max={1024} step={256}/>
      <SliderEdit label="height" bind:value={imageRequest.height} min={512} max={1024} step={256}/>
    </div>
-->
    <div class="hbox gap-5">
      <div class="vbox" style="width: 400px;">
        <SliderEdit label="width" bind:value={width} min={512} max={1536} step={128}/>
        <SliderEdit label="height" bind:value={height} min={512} max={1536} step={128}/>
      </div>
    </div>

    <div class="vbox">
      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/>
<!--      <SliderEdit label="steps" bind:value={imageRequest.steps} min={1} max={200} step={1}/> -->
    </div>
  </div>

  {#if $onlineAccount != null}   <!-- onMountの時点で明らかだがsvelteでは!が使えない -->
  <div class="flex flex-row gap-5 w-full items-center my-4 ">
    <button disabled={busy || $onlineAccount.feathral < 1} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      <div class="flex justify-center items-center h-6">
        {#if busy}
          <ProgressRadial stroke={220} meter="stroke-success-200" track="stroke-success-400" width="w-4"/>
        {:else}
          生成
          <FeathralCost showsLabel={false} cost={estimatedCost} />
        {/if}
        </div>
    </button>
    {#if $onlineAccount.feathral < 1}
    <div class="warning">Feathralが足りません</div>
    {/if}

    <ProgressBar label="Progress Bar" value={progress} max={1} />
  </div>
  {/if}
  <Gallery columnWidth={220} bind:canvases={gallery} on:commit={onChooseImage} bind:refered={refered}/>
  {:else}
    <p>サインインしてください</p>
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
</style>
