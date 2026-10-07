<script lang="ts">
  import type { ImagingModel } from '$protocolTypes/imagingTypes';
  import SliderEdit from '../utils/SliderEdit.svelte';
  import { getSizeRangeForMode } from '../utils/feathralImaging';

  export let model: ImagingModel;
  export let width: number;
  export let height: number;
  export let batchCount: number;

  // nano-banana系: アスペクト比＋解像度指定
  const NANO_BANANA_ASPECT_RATIOS = ["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"] as const;
  const RESOLUTION_TARGET_MP: Record<string, number> = { "0.5K": 0.25, "1K": 1.0, "2K": 4.0, "4K": 9.0 };
  export let aspectRatio = "1:1";
  let nanoBananaResolution: "0.5K" | "1K" | "2K" | "4K" = "1K";

  $: isNanoBanana = model === 'nano-banana' || model === 'nano-banana-pro' || model === 'nano-banana-2' || model === 'nano-banana-2.1';
  $: ({ min: sizeMin, max: sizeMax } = getSizeRangeForMode(model));

  // nano-banana-pro/2.1は0.5K非対応→1Kにフォールバック
  $: if ((model === 'nano-banana-pro' || model === 'nano-banana-2.1') && nanoBananaResolution === '0.5K') {
    nanoBananaResolution = '1K';
  }

  // アスペクト比と解像度からwidth/heightを計算（サーバーがgetClosestAspectRatio/getResolutionFromSizeで逆変換）
  $: if (isNanoBanana) {
    const res = model === 'nano-banana' ? '1K' : nanoBananaResolution;
    const [aw, ah] = aspectRatio.split(':').map(Number);
    const ratio = aw / ah;
    const targetPixels = RESOLUTION_TARGET_MP[res] * 1024 * 1024;
    height = Math.max(64, Math.round(Math.sqrt(targetPixels / ratio) / 64) * 64);
    width = Math.max(64, Math.round(height * ratio / 64) * 64);
  }
</script>

<div class="image-size-controls">
  {#if isNanoBanana}
    <select class="select h-8 p-0 w-32" bind:value={aspectRatio}>
      {#each NANO_BANANA_ASPECT_RATIOS as ar}
        <option value={ar}>{ar}</option>
      {/each}
    </select>
    {#if model !== 'nano-banana'}
      <select class="select h-8 p-0 w-24" bind:value={nanoBananaResolution}>
        {#if model === 'nano-banana-2'}
          <option value="0.5K">0.5K</option>
        {/if}
        <option value="1K">1K</option>
        <option value="2K">2K</option>
        <option value="4K">4K</option>
      </select>
    {/if}
    <div class="count-col">
      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/>
    </div>
  {:else}
    <div class="size-col" style="width: 400px;">
      <SliderEdit label="width" bind:value={width} min={sizeMin} max={sizeMax} step={128}/>
      <SliderEdit label="height" bind:value={height} min={sizeMin} max={sizeMax} step={128}/>
    </div>
    <div class="count-col">
      <SliderEdit label="image count" bind:value={batchCount} min={1} max={4} step={1}/>
    </div>
  {/if}
</div>

<style>
  .image-size-controls {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
  }

  .size-col {
    display: flex;
    flex-direction: column;
  }

  .count-col {
    display: flex;
    flex-direction: column;
  }
</style>
