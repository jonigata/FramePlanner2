<script lang="ts">
  import "../box.css"  
  import { onMount } from 'svelte';
  import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import KeyValueStorage from "../utils/KeyValueStorage.svelte";
  import type { Page } from '../bookeditor/book';
  import { onlineAccount, updateToken } from "../utils/accountStore";
  import Feathral from '../utils/Feathral.svelte';
  import { persistent } from '../utils/persistent';
  import { GenerateImageContext, generateImage } from '../utils/feathralImaging';
  import type { Stats } from "./batchImagingStore";
  import { createCanvasFromImage } from '../utils/imageUtil';

  export let stats: Stats;

  let keyValueStorage: KeyValueStorage = null;
  let storedApiKey: string = null;
  let apiKey: string;
  let postfix: string = "";
  let generateContext = new GenerateImageContext();

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (!keyValueStorage || !keyValueStorage.isReady() || ak === storedApiKey) { return; }
    await keyValueStorage.set("apiKey", ak);
    storedApiKey = ak;
  }

  export async function excecute(page: Page) {
    await generateAll(page);
  }

  async function generate(frame: FrameElement) {
    const result = await generateImage(`${frame.prompt}, ${postfix}`, 1024, 1024, generateContext);
    if (result != null) {
      await result.images[0].decode();
      const film = new Film();
      const media = new ImageMedia(createCanvasFromImage(result.images[0]));
      film.media = media;
      frame.filmStack.films.push(film);
      frame.gallery.push(media.canvas);
      stats.succeeded++;
    } else {
      stats.failed++;
    }
  }

  async function generateAll(page: Page) {
    generateContext.reset();
    const leaves = collectLeaves(page.frameTree).filter(
      (leaf) => 0 == leaf.filmStack.films.length);
    const promises = [];
    for (const leaf of leaves) {
      promises.push(generate(leaf));
    }
    stats.total = promises.length;
    stats.succeeded = 0;
    stats.failed = 0;
    await Promise.all(promises);

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    for (const leaf of leaves) {
      const leafLayout = findLayoutOf(pageLayout, leaf);
      const transformer = new FilmStackTransformer(page.paperSize, leaf.filmStack.films);
      transformer.scale(0.01);
      console.log("scaled");
      constraintLeaf(page.paperSize, leafLayout);
    }
    $updateToken = true;
  }

  onMount(async () => {
    await keyValueStorage.waitForReady();
    storedApiKey = await keyValueStorage.get("apiKey") ?? '';
    apiKey = storedApiKey;
  });
</script>

<div class="drawer-content">
  <div class="hbox gap-2">
    スタイル
    <textarea class="w-96" bind:value={postfix} use:persistent={{db: 'preferences', store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  </div>
  {#if $onlineAccount}
  <p><Feathral/></p>
  {/if}
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"dall-e-3"} storeName={"default-parameters"}/>

<style>
</style>
