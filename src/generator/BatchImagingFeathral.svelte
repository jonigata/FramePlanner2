<script lang="ts">
  import "../box.css"  
  import { onMount } from 'svelte';
  import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf, Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/frameTree';
  import KeyValueStorage from "../utils/KeyValueStorage.svelte";
  import type { Page } from '../bookeditor/book';
  import { generateImageFromTextWithFeathral } from '../firebase';
  import { onlineAccount } from "../utils/accountStore";
  import Feathral from '../utils/Feathral.svelte';
  import { persistent } from '../utils/persistent';

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

  // ImageGeneratorFeathralからコピペした
  async function generate(frame: FrameElement) {
    console.log("running feathral");
    try {
      let imageRequest = {
        "style": "anime",
        "prompt": frame.prompt + ", " + postfix,
        "width": 1024,
        "height": 1024,
        "output_format": "png"
      };
      console.log(imageRequest);

      const data = await generateImageFromTextWithFeathral(imageRequest);
      console.log(data);
      const img = document.createElement('img');
      img.src = "data:image/png;base64," + data.result.image;

      const film = new Film();
      film.image = img;
      frame.filmStack.films.push(film);
      frame.gallery.push(img);

      $onlineAccount.feathral = data.feathral;
    }
    catch(error) {
    }
  }


  async function generateAll(page: Page) {
    const leaves = collectLeaves(page.frameTree).filter(
      (leaf) => 0 == leaf.filmStack.films.length);
    const promises = [];
    for (const leaf of leaves) {
      promises.push(generate(leaf));
    }
    await Promise.all(promises);

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    for (const leaf of leaves) {
      const leafLayout = findLayoutOf(pageLayout, leaf);
      const transformer = new FilmStackTransformer(page.paperSize, leaf.filmStack.films);
      transformer.scale(0.01);
      console.log("scaled");
      constraintLeaf(page.paperSize, leafLayout);
    }
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
    <textarea class="w-96" bind:value={postfix} use:persistent={{db: 'preferences', store:'imaging', key:'style'}}/>
  </div>
  {#if $onlineAccount}
  <p><Feathral/></p>
  {/if}
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"dall-e-3"} storeName={"default-parameters"}/>

<style>
</style>
