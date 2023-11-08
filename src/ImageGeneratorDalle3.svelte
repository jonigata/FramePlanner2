<script lang="ts">
  import { imageGeneratorOpen, imageGeneratorPrompt, imageGeneratorGallery, imageGeneratorChosen } from "./imageGeneratorStore";
  import { generateImages, getProgression } from "./sdwebui";
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import KeyValueStorage from "./KeyValueStorage.svelte";
  import { tick, onMount } from "svelte";
  import { toastStore } from '@skeletonlabs/skeleton';
  import OpenAI from 'openai';
  import { setIn } from "svelte-jsoneditor";

  export let busy: boolean;

  let images: HTMLImageElement[] = [];
  let imageRequest = {
     "positive": "1 cat",
  }
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

  $: imageRequest.positive = $imageGeneratorPrompt;
  $: onChangeGallery($imageGeneratorGallery);
  async function onChangeGallery(gallery: HTMLImageElement[]) {
    if (gallery) {
      images = [];
      await tick(); // HACK: なんかこうしないとHTMLが更新されない
      images = gallery;
    }
  }

  async function generate() {
    busy = true;

    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      let n = 0;
      const q = setInterval(() => {
        if (busy) {
          progress = ++n / 15;
          if (1.0 <= progress) {
            progress = 1.0;
          }
        } else {
          progress = 0;
        }
      }, 1000);
      const response: OpenAI.Images.ImagesResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: imageRequest.positive,
        response_format: 'b64_json',
      });

      const imageJson = response.data[0].b64_json;
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + imageJson;

      images.push(img);
      images = images;
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
    $imageGeneratorChosen = detail;
    $imageGeneratorOpen = false;
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
  <input type="text" bind:value={apiKey}/>
  <p>prompt</p>
  <textarea bind:value={imageRequest.positive}/>

  <div class="hbox gap-5">
    <button disabled={busy} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      Generate
    </button>
  </div>

  <ProgressBar label="Progress Bar" value={progress} max={1} />
  <Gallery columnWidth={220} bind:images={images} on:commit={onChooseImage} bind:refered={refered}/>
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
