<script lang="ts">
  import { generateImages, getProgression } from "./sdwebui";
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import { onMount } from "svelte";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { makePlainImage, canvasToBase64 } from "../utils/imageUtil";
  import { createPreference } from '../preferences';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: HTMLCanvasElement[];
  export let chosen: HTMLCanvasElement | null;

  let url: string = "http://localhost:7860";
  let imageRequest = {
     "negative": "EasyNegative",
     "width": 512,
     "height": 512,
     "batchSize": 3,
     "batchCount": 3,
     "samplingSteps": 20,
     "cfgScale": 7,
  }
  let progress = 0;
  let refered: HTMLCanvasElement | null = null;

  const preference1 = createPreference<string>("imaging", "imageRequest");
  const preference2 = createPreference<string>("imaging", "url");

  async function generate() {
    await preference1.set(JSON.stringify(imageRequest));
    await preference2.set(url);

    let f: (() => Promise<void>) | null = null;
    f = async () => {
      const data = await getProgression(url);
      if (busy) {
        progress = data.progress;
      }

      // getProgression呼び出しが1秒を超えると嫌なので
      // setIntervalは使わない
      setTimeout(() => {if (busy) {f!();}},1000);
    };

    busy = true;
    f();
    try {
      const newImages = await generateImages(url, { ...imageRequest, positive: prompt });
      gallery.splice(gallery.length, 0, ...newImages);
      gallery = gallery;
      progress = 1;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
      progress = 0;
    }
    busy = false;
  }

  function onChooseImage({detail}: CustomEvent<HTMLCanvasElement>) {
    chosen = detail;
  }

  onMount(async () => {
    const data = await preference1.get();
    if (data) {
      imageRequest = JSON.parse(data);
    }
    url = (await preference2.get()) ?? url;
  });

  function generateWhiteImage() {
    const img = makePlainImage(imageRequest.width, imageRequest.height, "#ffffff");
    gallery.push(img);
    gallery = gallery;
  }

  async function scribble() {
    if (!refered) {
      toastStore.trigger({ message: `参照画像を選択してください`, timeout: 3000});
      return;
    } 

    await preference1.set(JSON.stringify(imageRequest));
    await preference2.set(url);

    let f: (() => Promise<void>) | null = null;
      f = async () => {
      const data = await getProgression(url);
      if (busy) {
        progress = data.progress;
      }

      // getPorgression呼び出しが1秒を超えると嫌なので
      // setIntervalは使わない
      setTimeout(() => {if (busy) {f!();}},1000);
    };

    busy = true;
    f();
    try {
      const encoded_image = canvasToBase64(refered!);

      const alwaysonScripts = {
        controlNet: {
          args: [
            {
              input_image: encoded_image,
              module: "scribble_xdog",
              model: "control_v11p_sd15_scribble [d4ba51ff]",
              weight: 0.75,
              resize_mode: 0,
              threshold_a: 32,
            }
          ]
        }
      };
      console.log(alwaysonScripts);

      const req = { ...imageRequest, alwayson_scripts: alwaysonScripts };
      const newImages = await generateImages(url, req);
      gallery.splice(gallery.length, 0, ...newImages);
      gallery = gallery;
      progress = 1;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
      progress = 0;
    }
    busy = false;

  }

</script>

<div class="drawer-content">
  <p>URL</p>
  <input class="input" style="width: 100%;" bind:value={url}/>
  <p>prompt</p>
  <textarea class="textarea" bind:value={prompt}/>
  <p>negative prompt</p>
  <textarea class="textarea" bind:value={imageRequest.negative}/>

  <div class="hbox gap-5">
    <div class="vbox" style="width: 400px;">
      <SliderEdit label="width" bind:value={imageRequest.width} min={512} max={2048} step={64}/>
      <SliderEdit label="height" bind:value={imageRequest.height} min={512} max={2048} step={64}/>
    </div>

    <div class="vbox">
      <SliderEdit label="batch count" bind:value={imageRequest.batchCount} min={1} max={100} step={1}/>
      <SliderEdit label="batch size" bind:value={imageRequest.batchSize} min={1} max={8} step={1}/>
    </div>
  </div>

  <div class="hbox gap-5" style="width: 700px;">
    <SliderEdit label="steps" bind:value={imageRequest.samplingSteps} min={1} max={200} step={1}/>
    <SliderEdit label="CFG Scale" bind:value={imageRequest.cfgScale} min={1} max={30} step={0.5}/>
  </div>

  <div class="hbox gap-5">
    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      Generate
    </button>

    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generateWhiteImage}>
      White Image
    </button>

    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={scribble}>
      Scribble
    </button>
  </div>

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
</style>
