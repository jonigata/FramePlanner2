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
  import { type ImagingContext, generateFluxImage } from '../utils/feathralImaging';
  import { createCanvasFromImage } from '../utils/imageUtil';

  export let imagingContext: ImagingContext;

  let keyValueStorage: KeyValueStorage = null;
  let storedApiKey: string = null;
  let apiKey: string;
  let postfix: string = "";
  

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
    console.log("postfix", postfix);
    const result = await generateFluxImage(`${postfix}\n${frame.prompt}`, "square_hd", "schnell", 1, imagingContext);
    if (result != null) {
      await result.images[0].decode();
      const film = new Film();
      const media = new ImageMedia(createCanvasFromImage(result.images[0]));
      film.media = media;
      frame.filmStack.films.push(film);
      frame.gallery.push(media.canvas);
      imagingContext.succeeded++;
    } else {
      imagingContext.failed++;
    }
  }

  async function generateAll(page: Page) {
    imagingContext.awakeWarningToken = true;
    imagingContext.errorToken = true;
    const leaves = collectLeaves(page.frameTree).filter(
      (leaf) => 0 == leaf.filmStack.films.length);
    const promises = [];
    for (const leaf of leaves) {
      promises.push(generate(leaf));
    }
    imagingContext.total = promises.length;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
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

<div class="flex flex-col justify-center gap-2">
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
