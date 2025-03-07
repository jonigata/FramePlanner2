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
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { createCanvasFromImage } from '../lib/layeredCanvas/tools/imageUtil';
  import { type ImagingContext, generateImage } from '../utils/feathralImaging';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: HTMLCanvasElement[];
  export let chosen: HTMLCanvasElement;

  let progress = 0;
  let refered: HTMLCanvasElement | null = null;
  let initialSize = [1024, 1024];
  let size = initialSize; // こうしないと最初に選択してくれない
  let postfix: string = "";

  function onChooseImage({detail}: CustomEvent<HTMLCanvasElement>) {
    chosen = detail;
  }

  async function generate() {
    busy = true;
    let q: ReturnType<typeof setInterval> | undefined = undefined;
    try {
      progress = 0;
      let delta = 1 / 8;
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
          return await generateImage(`${prompt}, ${postfix}`, size[0], size[1], imagingContext);
          // return await generateImageFromTextWithFeathral(imageRequest);
          // return { feathral: 99, result: { image: makePlainImage(imageRequest.width, imageRequest.height, "#00ff00ff") } };
        });
      if (result == null) {
        return;
      }

      await result.images[0].decode();
      const canvas = createCanvasFromImage(result.images[0]);

      gallery.push(canvas);
      gallery = gallery;
      progress = 1;

      logEvent(getAnalytics(), 'generate_feathral');

      $onlineAccount!.feathral = result.feathral;
    }
    finally {
      if (q !== undefined) {
        clearInterval(q);
      }
    }
    busy = false;
  }

  onMount(async () => {
    $onlineAccount!.feathral = await getFeathral();
    console.log($onlineAccount!.feathral);
  });

</script>

<div class="drawer-content">
  {#if $onlineStatus === 'signed-in'}
    <p><Feathral/></p>

    <p>スタイル</p>
    <textarea class="w-96 textarea" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
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
          <RadioItem bind:group={size} name={"size"} value={[1024,1280]}>1024x1280</RadioItem>
          <RadioItem bind:group={size} name={"size"} value={[1024,1536]}>1024x1536</RadioItem>
          <RadioItem bind:group={size} name={"size"} value={[1024,1792]}>1024x1792</RadioItem>
        </RadioGroup>
        <RadioGroup>
          <RadioItem bind:group={size} name={"size"} value={[1280,1024]}>1280x1024</RadioItem>
          <RadioItem bind:group={size} name={"size"} value={[1536,1024]}>1536x1024</RadioItem>
          <RadioItem bind:group={size} name={"size"} value={[1792,1024]}>1792x1024</RadioItem>
        </RadioGroup>
      </div>

      <div class="vbox">
  <!--      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/> -->
  <!--      <SliderEdit label="steps" bind:value={imageRequest.steps} min={1} max={200} step={1}/> -->
      </div>
    </div>

    {#if $onlineAccount != null}   <!-- onMountの時点で明らかだがsvelteでは!が使えない -->
    <div class="hbox gap-5">
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
    </div>
    {/if}
  {:else}
    <p>サインインしてください</p>
  {/if}

  <ProgressBar label="Progress Bar" value={progress} max={1} />
  <Gallery columnWidth={220} bind:canvases={gallery} on:commit={onChooseImage} bind:refered={refered}/>
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
