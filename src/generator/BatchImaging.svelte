<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { batchImagingOpen } from "./batchImagingStore";
  import "../box.css"  
  import { onMount } from 'svelte';
  import OpenAI from 'openai';
  import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { toastStore } from '@skeletonlabs/skeleton';
  import KeyValueStorage from "../utils/KeyValueStorage.svelte";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { commitToken } from '../undoStore';
  import { mainBook, redrawToken } from '../bookeditor/bookStore';
  import type { Page } from '../bookeditor/book';

  let totalCount = 1;
  let filledCount = 0;
  let keyValueStorage: KeyValueStorage = null;
  let storedApiKey: string = null;
  let apiKey: string;
  let busy = false;

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (!keyValueStorage || !keyValueStorage.isReady() || ak === storedApiKey) { return; }
    await keyValueStorage.set("apiKey", ak);
    storedApiKey = ak;
  }

  $: if($batchImagingOpen) {
    updateImageInfo();
  }

  function updateImageInfo() {
    let m = 0;
    let n = 0;
    for (const page of $mainBook.pages) {
      const leaves = collectLeaves(page.frameTree);
      m += leaves.length;
      n += leaves.filter((leaf) => leaf.image).length;
    }
    totalCount = m;
    filledCount = n;
  }

  // ImageGeneratorDalle3からコピペした
  async function generate(frame: FrameElement) {
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

      frame.image = {
        image: img,
        scribble: null,
        n_scale: 1,
        n_translation: [0, 0],
        rotation: 0,
        reverse: [1, 1],
        scaleLock: false,
      };
      frame.gallery.push(img);
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
    }
  }

  async function generateAll(page: Page) {

    busy = true;
    const leaves = collectLeaves(page.frameTree);
    const promises = [];
    for (const leaf of leaves) {
      if (leaf.image) { continue; }
      promises.push(generate(leaf));
    }
    await Promise.all(promises);

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    for (const leaf of leaves) {
      if (!leaf.image) { continue; }
      const layout = findLayoutOf(pageLayout, leaf);
      leaf.image.n_scale = 0.001;
      constraintLeaf(page.paperSize, layout);
    }

    busy = false;
    updateImageInfo();
    $redrawToken = true;
  }

  async function generateAllPages() {
    const pages = $mainBook.pages;
    for (const page of pages) {
      await generateAll(page);
    }
    $commitToken = true;
  }

  onMount(async () => {
    await keyValueStorage.waitForReady();
    storedApiKey = await keyValueStorage.get("apiKey") ?? '';
    apiKey = storedApiKey;
  });
</script>

<div class="drawer-outer">
  <Drawer open={$batchImagingOpen} size="220px" on:clickAway={() => $batchImagingOpen = false} placement={"top"}>
    <div class="drawer-content">
      <div>画像一括生成</div>
      <div>{filledCount}/{totalCount}</div>
      {#if busy}
        <ProgressRadial width={"w-16"}/>
      {:else}
        <div class="hbox gap-2">API key <input type="password" autocomplete="off" bind:value={apiKey}/></div>
        <button class="btn btn-sm variant-filled w-32" disabled={filledCount === totalCount} on:click={generateAllPages}>開始</button>
      {/if}
    </div>
  </Drawer>  
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"dall-e-3"} storeName={"default-parameters"}/>

<style>
  .drawer-content {
    background-color: rgb(var(--color-surface-100));
    width: 100%;
    height: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    font-size: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 24px;
  }
  input {
    width: 450px;
    font-size: 15px;
  }
</style>
