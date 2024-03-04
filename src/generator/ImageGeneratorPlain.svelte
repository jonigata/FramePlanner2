<script lang="ts">
  import { makePlainImage } from "../utils/imageUtil";
  import SliderEdit from '../utils/SliderEdit.svelte';
	import ColorPicker from 'svelte-awesome-color-picker';

  export let chosen: HTMLImageElement = null;

  let width: number = 512;
  let height: number = 512;
  let color: string = "#ffffff00";

  async function generate() {
    chosen = await makePlainImage(width, height, color);
  }
</script>

<div class="drawer-content">
  <div class="hbox gap-5">
    <div class="vbox" style="width: 400px;">
      <SliderEdit label="width" bind:value={width} min={512} max={1024} step={256}/>
      <SliderEdit label="height" bind:value={height} min={512} max={1024} step={256}/>
    </div>
    <ColorPicker bind:hex={color} label="" />
  </div>

  <div class="hbox gap-5">
    <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      Generate
    </button>
  </div>
</div>

<style>
  .drawer-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin: 16px;
  }
  .generate-button {
    width: 160px;
  }
</style>
