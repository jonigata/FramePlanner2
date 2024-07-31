<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import KeyValueStorage from "../utils/KeyValueStorage.svelte";
  import { onMount } from "svelte";
  import { toastStore } from '@skeletonlabs/skeleton';
  import OpenAI from 'openai';
  import { createCanvasFromImage } from '../utils/imageUtil';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: HTMLCanvasElement[];
  export let chosen: HTMLCanvasElement;

  let imageRequest = {};
  let progress = 0;
  let keyValueStorage: KeyValueStorage = null;
  let refered: HTMLImageElement = null;
  let storedApiKey: string = null;
  let apiKey: string = '';

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (!keyValueStorage || ak === storedApiKey) { return; }
    await keyValueStorage.set("apiKey", ak);
    storedApiKey = ak;
  }

  async function generate() {
    busy = true;

    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      progress = 0;
      let delta = 1 / 15;
      const q = setInterval(() => {progress = Math.min(1.0, progress+delta);}, 1000);
      const response: OpenAI.Images.ImagesResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        response_format: 'b64_json',
      });

      const imageJson = response.data[0].b64_json;
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + imageJson;
      await img.decode();
      const canvas = createCanvasFromImage(img);

      gallery.push(canvas);
      gallery = gallery;
      progress = 1;

      clearInterval(q);
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
      progress = 0;
    }
    busy = false;
  }

  function onChooseImage({detail}) {
    console.log("chooseImage", detail);
    chosen = detail;
  }

  onMount(async () => {
    await keyValueStorage.waitForReady();
    const data = await keyValueStorage.get("imageRequest");
    if (data) {
      imageRequest = JSON.parse(data);
    }
    storedApiKey = await keyValueStorage.get("apiKey") ?? '';
    apiKey = storedApiKey;
  });

</script>

<div class="drawer-content">
  <p>API key</p>
  <input type="password" bind:value={apiKey} autocomplete="off"/>
  <p>prompt</p>
  <textarea bind:value={prompt}/>

  <div class="hbox gap-5">
    <button disabled={busy} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      Generate
    </button>
  </div>

  <ProgressBar label="Progress Bar" value={progress} max={1} />
  <Gallery columnWidth={220} bind:canvases={gallery} on:commit={onChooseImage} bind:refered={refered}/>
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"dall-e-3"} storeName={"default-parameters"}/>

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
  input {
    width: 450px;
  }
  .generate-button {
    width: 160px;
  }
</style>
