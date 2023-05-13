<script lang="ts">
  import { imageGeneratorOpen, imageGeneratorPrompt, imageGeneratorGallery, imageGeneratorChosen } from "./imageGeneratorStore";
  import { generateImages, getProgression } from "./sdwebui";
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import SliderEdit from './SliderEdit.svelte';
  import Drawer from './Drawer.svelte';
  import KeyValueStorage from "./KeyValueStorage.svelte";
  import { tick, onMount } from "svelte";
  import { toastStore } from '@skeletonlabs/skeleton';

  let url: string = "http://localhost:7860";
  let images: HTMLImageElement[] = [];
  let imageRequest = {
     "positive": "1 cat",
     "negative": "EasyNegative",
     "width": 512,
     "height": 512,
     "batchSize": 3,
     "batchCount": 3,
     "samplingSteps": 20,
     "cfgScale": 7,
  }
  let calling;
  let progress = 0;
  let storage;

/*
  const x = [new Image(), new Image(), new Image()];
  x[0].src = i1;
  x[1].src = i2;
  x[2].src = i3;
*/

  $: imageRequest.positive = $imageGeneratorPrompt;
  $: onChangeGallery($imageGeneratorGallery);
  async function onChangeGallery(gallery) {
    if (gallery) {
      images = [];
      await tick(); // HACK: なんかこうしないとHTMLが更新されない
      images = gallery;
    }
  }

  async function generate() {
    let f = null;
    f = async () => {
      storage.set("imageRequest", JSON.stringify(imageRequest));
      storage.set("url", url);
      const data = await getProgression(url);
      if (calling) {
        progress = data.progress;
      }

      // getPorgression呼び出しが1秒を超えると嫌なので
      // setIntervalは使わない
      setTimeout(
        () => {
          if (calling) {
            f();
          }
        },
        1000);
    };

    calling = true;
    f();
    try {
      const newImages = await generateImages(url, imageRequest);
      images.splice(images.length, 0, ...newImages);
      images = images;
      progress = 1;
    } catch (e) {
      console.log(e);
      toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
      progress = 0;
    }
    calling = false;
  }

  function onChooseImage({detail}) {
    console.log("chooseImage", detail);
    $imageGeneratorChosen = detail;
    $imageGeneratorOpen = false;
  }

  onMount(async () => {
    await storage.isReady();
    const data = await storage.get("imageRequest");
    url = await storage.get("url") ?? url;
    if (data) {
      imageRequest = JSON.parse(data);
    }
  });

  function onClickAway() {
    if (calling) { return; }
    $imageGeneratorOpen = false;
  }

  async function generateWhiteImage() {
    const canvas = document.createElement("canvas");
    canvas.width = imageRequest.width;
    canvas.height = imageRequest.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.src = canvas.toDataURL();
    await img.decode();
    images.push(img);
    images = images;
  }

</script>

<div class="drawer-outer">
  <Drawer
    open={$imageGeneratorOpen}
    placement="right"
    size="720px"
    on:clickAway={onClickAway}
  >
    <div class="drawer-content">
      <p>URL</p>
      <input style="width: 100%;" bind:value={url}/>
      <p>prompt</p>
      <textarea bind:value={imageRequest.positive}/>
      <p>negative prompt</p>
      <textarea bind:value={imageRequest.negative}/>

      <div class="hbox gap-5">
        <div class="vbox" style="width: 400px;">
          <SliderEdit label="width" bind:value={imageRequest.width} min={512} max={2048} step={64}/>
          <SliderEdit label="height" bind:value={imageRequest.height} min={512} max={2048} step={64}/>
        </div>

        <div class="vbox">
          <SliderEdit label="batch count" bind:value={imageRequest.batchCount} min={1} max={100} step={1}/>
          <SliderEdit label="batch size" bind:value={imageRequest.batchSize} min={1} max={8} step={1}/>
        </div>
      </div>

      <div class="hbox gap-5" style="width: 700px;">
        <SliderEdit label="steps" bind:value={imageRequest.samplingSteps} min={1} max={200} step={1}/>
        <SliderEdit label="CFG Scale" bind:value={imageRequest.cfgScale} min={1} max={30} step={0.5}/>
      </div>

      <div class="hbox gap-5">
        <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
          Generate
        </button>

        <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generateWhiteImage}>
          White Image
        </button>
      </div>

      <ProgressBar label="Progress Bar" value={progress} max={1} />
      <Gallery columnWidth={220} bind:images={images} on:commit={onChooseImage}/>
    </div>
  </Drawer>
</div>

<KeyValueStorage bind:this={storage} dbName={"image-generator"} storeName={"generation-request"}/>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
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
  .generate-button {
    width: 160px;
  }
</style>
