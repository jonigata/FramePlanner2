<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from '../gallery/Gallery.svelte';
  import { onMount } from "svelte";
  import { toastStore } from '@skeletonlabs/skeleton';
  import OpenAI from 'openai';
  import { createCanvasFromImage } from '../lib/layeredCanvas/tools/imageUtil';
  import { createPreference } from '../preferences';
  import { ImageMedia, type Media } from "../lib/layeredCanvas/dataModels/media";
  import { _ } from 'svelte-i18n';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: Media[];
  export let chosen: Media | null;

  let progress = 0;
  let refered: Media | null;
  let apiKey: string = '';

  const apiKeyPreference1 = createPreference<string>("imaging", "openAiApiKey");

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (ak) {
      await apiKeyPreference1.set(ak);
    }
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

      const imageJson = response.data![0].b64_json;
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + imageJson;
      await img.decode();
      const canvas = createCanvasFromImage(img);

      gallery.push(new ImageMedia(canvas));
      gallery = gallery;
      progress = 1;

      clearInterval(q);
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `${$_('generator.imageGenerationError')}${e}`, timeout: 3000});
      progress = 0;
    }
    busy = false;
  }

  function onChooseImage({detail}: CustomEvent<Media>) {
    console.log("chooseImage", detail);
    chosen = detail;
  }

  onMount(async () => {
    apiKey = await apiKeyPreference1.getOrDefault('');
  });
</script>

<div class="drawer-content">
  <p>API key</p>
  <input class="input" type="password" bind:value={apiKey} autocomplete="off"/>
  <p>prompt</p>
  <textarea class="textarea" bind:value={prompt}/>

  <div class="hbox gap-5">
    <button disabled={busy} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      Generate
    </button>
  </div>

  <ProgressBar label="Progress Bar" value={progress} max={1} />
  <Gallery columnWidth={220} bind:items={gallery} on:commit={onChooseImage} bind:refered={refered}/>
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
  input {
    width: 450px;
  }
  .generate-button {
    width: 160px;
  }
</style>
