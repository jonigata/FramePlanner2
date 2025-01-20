<script lang="ts">
  import { makePlainCanvas } from "../lib/layeredCanvas/tools/imageUtil";
  import SliderEdit from '../utils/SliderEdit.svelte';
	import ColorPickerLabel from '../utils/colorpicker/ColorPickerLabel.svelte';
  import { ImageMedia, type Media } from "../lib/layeredCanvas/dataModels/media";

  export let chosen: Media | null = null;

  let width: number = 512;
  let height: number = 512;
  let color: string = "#ffffff00";

  async function generate() {
    chosen = new ImageMedia(makePlainCanvas(width, height, color));
  }
</script>

<div class="drawer-content">
  <div class="hbox gap-5">
    <div class="vbox" style="width: 400px;">
      <SliderEdit label="width" bind:value={width} min={512} max={1024} step={256}/>
      <SliderEdit label="height" bind:value={height} min={512} max={1024} step={256}/>
    </div>
    <div class="color-label">
      <ColorPickerLabel bind:hex={color}/>
    </div>
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
  .color-label {
    width: 30px;
    height: 20px;
    margin-left: 4px;
    margin-right: 4px;
  }
</style>
