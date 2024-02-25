<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from './Gallery.svelte';
  import { onlineAccount } from "../utils/accountStore";
  import feathralIcon from '../assets/feathral.png';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import { onMount } from 'svelte';
  import { updateFeathral, generateImageFromTextWithFeathral } from '../firebase';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: HTMLImageElement[];
  export let chosen: HTMLImageElement;

  let progress = 0;
  let refered: HTMLImageElement = null;
  let batchCount = 1;

  let imageRequest = {
    "model": "lcm-dark-sushi-mix-v2-25",
    "prompt": "1 chibi girl, penguin costume",
    "negative_prompt": "Disfigured, cartoon, blurry",
    "width": 512,
    "height": 512,
    "steps": 4,
    "seed": 0,
    "output_format": "png"
  };

  let url = 'http://127.0.0.1:5001/frameplanner-e5569/us-central1/generateImageFromText';

  function onChooseImage({detail}) {
    chosen = detail;
  }

  async function generate() {
    busy = true;
    try {
      imageRequest.prompt = prompt;
      const { image, feathral } = await generateImageFromTextWithFeathral(imageRequest);
      $onlineAccount.feathral = feathral;
      gallery.push(image);
      gallery = gallery;
    }
    catch(error) {
    }
    busy = false;
  }

  onMount(async () => {
    $onlineAccount.feathral = await updateFeathral();
    console.log($onlineAccount.feathral);
  });

</script>

<div class="drawer-content">
  {#if $onlineAccount}
  <p><img src={feathralIcon} alt="feathral" width=24 height=24/>Feathral: {$onlineAccount.feathral}</p>

  <p>prompt</p>
  <textarea bind:value={prompt}/>
  <p>negative prompt</p>
  <textarea bind:value={imageRequest.negative_prompt}/>

  <div class="hbox gap-5">
    <div class="vbox" style="width: 400px;">
      <SliderEdit label="width" bind:value={imageRequest.width} min={512} max={1024} step={256}/>
      <SliderEdit label="height" bind:value={imageRequest.height} min={512} max={1024} step={256}/>
    </div>

    <div class="vbox">
<!--      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/> -->
<!--      <SliderEdit label="steps" bind:value={imageRequest.steps} min={1} max={200} step={1}/> -->
    </div>
  </div>

<!--
  <div class="hbox gap-5" style="width: 700px;">
  </div>
-->

  <div class="hbox gap-5">
    <button disabled={busy || $onlineAccount.feathral < 1} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      Generate
    </button>
    {#if $onlineAccount.feathral < 1}
    <div class="warning">Feathralが足りません</div>
    {/if}
  </div>
  {:else}
  <p>サインインしてください</p>
  {/if}

  <ProgressBar label="Progress Bar" value={progress} max={1} />
  <Gallery columnWidth={220} bind:images={gallery} on:commit={onChooseImage} bind:refered={refered}/>
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
  .generate-button {
    width: 160px;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
  }
  img {
    display: inline-block;
  }
  .warning {
    color: #d22;
  }
</style>
