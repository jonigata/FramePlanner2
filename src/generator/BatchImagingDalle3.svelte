<script lang="ts">
  import "../box.css"  
  import { onMount } from 'svelte';
  import OpenAI from 'openai';
  import { FrameElement, ImageMedia, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf, Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/frameTree';
  import { toastStore } from '@skeletonlabs/skeleton';
  import KeyValueStorage from "../utils/KeyValueStorage.svelte";
  import type { Page } from '../bookeditor/book';

  let keyValueStorage: KeyValueStorage = null;
  let storedApiKey: string = null;
  let apiKey: string;

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (!keyValueStorage || !keyValueStorage.isReady() || ak === storedApiKey) { return; }
    await keyValueStorage.set("apiKey", ak);
    storedApiKey = ak;
  }

  export async function excecute(page: Page) {
    await generateAll(page);
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
        prompt: frame.prompt,
        response_format: 'b64_json',
      });

      const imageJson = response.data[0].b64_json;
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + imageJson;

      const film = new Film();
      film.media = new ImageMedia(img);
      frame.filmStack.films.push(film);
      frame.gallery.push(img);
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
    }
  }

  async function generateAll(page: Page) {
    const leaves = collectLeaves(page.frameTree);
    const promises = [];
    for (const leaf of leaves) {
      if (0 < leaf.filmStack.films.length) { continue; }
      promises.push(generate(leaf));
    }
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

<div class="drawer-content">
  <div class="hbox gap-2">API key <input type="password" autocomplete="off" bind:value={apiKey}/></div>
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"dall-e-3"} storeName={"default-parameters"}/>

<style>
  .drawer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  input {
    width: 450px;
    font-size: 15px;
  }
</style>
