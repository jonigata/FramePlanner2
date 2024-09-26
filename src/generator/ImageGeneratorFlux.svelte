<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import { onlineAccount, onlineStatus } from "../utils/accountStore";
  import { onMount } from 'svelte';
  import { getFeathral } from '../firebase';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { getAnalytics, logEvent } from "firebase/analytics";
  import Feathral from '../utils/Feathral.svelte';
  import { persistentText } from '../utils/persistentText';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { createCanvasFromImage } from '../utils/imageUtil';
  import { type ImagingContext, type Mode, generateFluxImage } from '../utils/feathralImaging';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import FluxModes from './FluxModes.svelte';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: HTMLCanvasElement[];
  export let chosen: HTMLCanvasElement;

  let progress = 0;
  let refered: HTMLImageElement = null;
  let initialSize = "square_hd";
  let size = initialSize; // こうしないと最初に選択してくれない
  let postfix: string = "";
  let batchCount = 1;
  let mode: Mode = "schnell";

  function onChooseImage({detail}) {
    chosen = detail;
  }

  async function generate() {
    busy = true;
    try {
      progress = 0;
      let delta = 0;
      switch (mode) {
        case "schnell":
          delta = 1 / 5;
          break;
        case "pro":
          delta = 1 / 24;
          break;
        case "chibi":
          delta = 1 / 12;
          break;
        case "manga":
          delta = 1 / 12;
          break;
      }
      const q = setInterval(() => {progress = Math.min(1.0, progress+delta);}, 1000);
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
          return await generateFluxImage(`${postfix}\n${prompt}`, size, mode, batchCount, imagingContext);
          // return await generateImageFromTextWithFeathral(imageRequest);
          // return { feathral: 99, result: { image: makePlainImage(imageRequest.width, imageRequest.height, "#00ff00ff") } };
        });

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
      clearInterval(q);

      $onlineAccount.feathral = result.feathral;
    }
    catch(error) {
      console.log(error);
      toastStore.trigger({ message: `画像生成エラー: ${error}`, timeout: 3000});
    }
    busy = false;
  }

  onMount(async () => {
    $onlineAccount.feathral = await getFeathral();
    console.log($onlineAccount.feathral);
  });

</script>

<div class="drawer-content">
  {#if $onlineStatus === 'signed-in'}
  <p><Feathral/></p>

  <p>モード</p>
  <div class="vbox left gap-2 mode">
    <FluxModes bind:mode={mode}/>
  </div>

  <p>スタイル</p>
  <textarea class="w-96 textarea" bind:value={postfix} use:persistentText={{db: 'preferences', store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  <p>プロンプト</p>
  <textarea class="textarea" bind:value={prompt}/>
<!--
  <p>negative prompt</p>
  <textarea bind:value={imageRequest.negative_prompt}/>
-->

  <div class="hbox gap-5">
<!--
    <div class="vbox" style="width: 400px;">
      <SliderEdit label="width" bind:value={imageRequest.width} min={512} max={1024} step={256}/>
      <SliderEdit label="height" bind:value={imageRequest.height} min={512} max={1024} step={256}/>
    </div>
-->
    <div class="vbox left gap-2">
      <RadioGroup>
        <RadioItem bind:group={size} name={"size"} value={initialSize}>1024x1024</RadioItem>
        <RadioItem bind:group={size} name={"size"} value={"square"}>512x512</RadioItem>
        <RadioItem bind:group={size} name={"size"} value={"landscape_4_3"}>1024x768</RadioItem>
        <RadioItem bind:group={size} name={"size"} value={"landscape_16_9"}>1024x576</RadioItem>
      </RadioGroup>
      <RadioGroup>
        <RadioItem bind:group={size} name={"size"} value={"portrait_4_3"}>768x1024</RadioItem>
        <RadioItem bind:group={size} name={"size"} value={"portrait_16_9"}>576x1024</RadioItem>
      </RadioGroup>
    </div>

    <div class="vbox">
      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/>
<!--      <SliderEdit label="steps" bind:value={imageRequest.steps} min={1} max={200} step={1}/> -->
    </div>
  </div>

  <div class="flex flex-row gap-5 w-full items-center">
    <button disabled={busy || $onlineAccount.feathral < 1} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      <div class="flex justify-center items-center h-6">
        {#if busy}
          <ProgressRadial stroke={220} meter="stroke-success-200" track="stroke-success-400" width="w-4"/>
        {:else}
          生成
        {/if}
        </div>
    </button>
    {#if $onlineAccount.feathral < 1}
    <div class="warning">Feathralが足りません</div>
    {/if}

    <ProgressBar label="Progress Bar" value={progress} max={1} />
  </div>
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
    gap: 10px;
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
</style>
