<script lang="ts">
  import { onMount } from 'svelte';
  import OpenAI from 'openai';
  import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import { toastStore } from '@skeletonlabs/skeleton';
  import KeyValueStorage from "../utils/KeyValueStorage.svelte";
  import type { Page } from '../bookeditor/book';
  import { createCanvasFromImage } from "../utils/imageUtil";
  import type { ImagingContext } from '../utils/feathralImaging';
  import { busy, batchImagingPage } from './batchImagingStore';
  import { mainBook, redrawToken } from '../bookeditor/bookStore';
  import { commitBook } from '../bookeditor/book';
  import { persistent } from '../utils/persistent';
  import "../box.css"  

  export let imagingContext: ImagingContext;

  let keyValueStorage: KeyValueStorage = null;
  let postfix: string = "";
  let storedApiKey: string = null;
  let apiKey: string;

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (!keyValueStorage || !keyValueStorage.isReady() || ak === storedApiKey) { return; }
    await keyValueStorage.set("apiKey", ak);
    storedApiKey = ak;
  }

  async function execute() {
    console.log('execute');
    $busy = true;
    await generateAll($batchImagingPage);
    $busy = false;
    console.log('execute done');

    commitBook($mainBook, null);
    $mainBook = $mainBook;
    $redrawToken = true;
    $batchImagingPage = $batchImagingPage;
  }

  // ImageGeneratorDalle3からコピペした
  async function generate(frame: FrameElement) {
    console.log("running dalle3");
    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      let n = 0;
      const response: OpenAI.Images.ImagesResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `${postfix}\n${frame.prompt}`,
        response_format: 'b64_json',
      });

      const imageJson = response.data[0].b64_json;
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + imageJson;
      await img.decode();

      const film = new Film();
      const media = new ImageMedia(createCanvasFromImage(img));
      film.media = media;
      frame.filmStack.films.push(film);
      frame.gallery.push(media.canvas);
      imagingContext.succeeded++;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
      imagingContext.failed++;
    }
  }

  async function generateAll(page: Page) {
    const leaves = collectLeaves(page.frameTree);
    const promises = [];
    for (const leaf of leaves) {
      if (0 < leaf.filmStack.films.length) { continue; }
      promises.push(generate(leaf));
    }
    imagingContext.total = promises.length;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
    await Promise.all(promises);

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    for (const leaf of leaves) {
      if (0 < leaf.filmStack.films.length) { continue; }
      const layout = findLayoutOf(pageLayout, leaf);
      const transformer = new FilmStackTransformer(page.paperSize, leaf.filmStack.films);
      transformer.scale(0.01);
      constraintLeaf(page.paperSize, layout);
    }
  }

  onMount(async () => {
    await keyValueStorage.waitForReady();
    storedApiKey = await keyValueStorage.get("apiKey") ?? '';
    apiKey = storedApiKey;
  });
</script>

<div class="flex flex-col justify-center gap-2">
  <div class="hbox gap-2">API key <input type="password" autocomplete="off" bind:value={apiKey}/></div>
  <div class="hbox gap-2">
    スタイル
    <textarea class="w-96" bind:value={postfix} use:persistent={{db: 'preferences', store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  </div>
  <button class="btn btn-sm variant-filled w-32" disabled={imagingContext.total === imagingContext.succeeded} on:click={execute}>開始</button>
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"dall-e-3"} storeName={"default-parameters"}/>

<style>
  input {
    width: 450px;
    font-size: 15px;
  }
</style>
