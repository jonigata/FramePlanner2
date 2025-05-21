<script lang="ts">
  import { onMount } from 'svelte';
  import OpenAI from 'openai';
  import { collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf, type Layout } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import { toastStore } from '@skeletonlabs/skeleton';
  import type { Page } from '../lib/book/book';
  import { createCanvasFromImage } from "../lib/layeredCanvas/tools/imageUtil";
  import type { ImagingContext } from '../utils/feathralImaging';
  import { busy, batchImagingPage } from './batchImagingStore';
  import { mainBook, redrawToken } from '../bookeditor/workspaceStore';
  import { commitBook } from '../lib/book/book';
  import { persistentText } from '../utils/persistentText';
  import { createPreference } from '../preferences';
  import "../box.css"  

  export let imagingContext: ImagingContext;

  let postfix: string = "";
  let apiKey: string;

  const apiKeyPreference1 = createPreference<string>("imaging", "openAiApiKey");

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (ak) {
      await apiKeyPreference1.set(ak);
    }
  }

  async function execute() {
    console.log('execute');
    $busy = true;
    await generateAll($batchImagingPage!);
    $busy = false;
    console.log('execute done');

    commitBook($mainBook!, null);
    $mainBook = $mainBook;
    $redrawToken = true;
    $batchImagingPage = null;
  }

  async function generate(paperSize: [number, number], leafLayout: Layout) {
    console.log("running dalle3");
    try {
      const frame = leafLayout.element;

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

      const imageJson = response.data![0].b64_json;
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + imageJson;
      await img.decode();

      const media = new ImageMedia(createCanvasFromImage(img));
      const film = new Film(media);
      film.media = media;
      frame.filmStack.films.push(film);
      frame.gallery.push(media);

      const transformer = new FilmStackTransformer(paperSize, frame.filmStack.films);
      transformer.scale(0.01);
      console.log("scaled");
      constraintLeaf(paperSize, leafLayout);
      $redrawToken = true;

      imagingContext.succeeded++;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
      imagingContext.failed++;
    }
  }

  async function generateAll(page: Page) {
    imagingContext.awakeWarningToken = true;
    imagingContext.errorToken = true;

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    const leaves = collectLeaves(page.frameTree);
    const promises = [];
    for (const leaf of leaves) {
      if (0 < leaf.filmStack.films.length) { continue; }
      const leafLayout = findLayoutOf(pageLayout, leaf)!;
      promises.push(generate(page.paperSize, leafLayout));
    }
    imagingContext.total = promises.length;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
    await Promise.all(promises);
  }

  onMount(async () => {
    apiKey = await apiKeyPreference1.getOrDefault('');
  });
</script>

<div class="flex flex-col gap-2 mt-2 w-full h-full">
  <div class="flex flex-row gap-2">
    <h3>API key</h3>
    <input class="input" type="password" autocomplete="off" bind:value={apiKey}/>
  </div>
  <div class="flex flex-row gap-2 items-center">
    <h3>スタイル</h3>
    <textarea class="textarea textarea-style w-96" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  </div>
  <button class="btn btn-sm variant-filled w-32" disabled={imagingContext.total === imagingContext.succeeded} on:click={execute}>開始</button>
</div>

<style>
  input {
    width: 300px;
    font-size: 15px;
    padding-left: 8px;
    padding-right: 8px;
  }
  h3 {
    font-family: '源暎エムゴ';
    font-weight: 500;
    font-size: 20px;
  }
  .textarea-style {
    font-size: 16px;
    font-weight: 700;
    font-family: '源暎アンチック';
    border-radius: 2px;
    padding-left: 8px;
    padding-right: 8px;
  }
</style>
