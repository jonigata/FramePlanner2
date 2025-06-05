<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import type { UpscaleRequest } from '../utils/edgeFunctions/types/imagingTypes';
  import { onMount } from 'svelte';
  import { resizeCanvasIfNeeded } from '../lib/layeredCanvas/tools/imageUtil';
  import FeathralCost from '../utils/FeathralCost.svelte';
  import { _ } from 'svelte-i18n';
  
  let canvas: HTMLCanvasElement;
  let scale: "2x" | "4x" = "2x";
  let targetWidth = 0;
  let targetHeight = 0;
  
  function onCancel() {
    modalStore.close();
  }

  function updateTargetDimensions() {
    if (!canvas) return;
    
    const scaleFactor = scale === "2x" ? 2 : 4;
    targetWidth = canvas.width * scaleFactor;
    targetHeight = canvas.height * scaleFactor;
  }

  async function onSubmit() {
    const resizedCanvas = resizeCanvasIfNeeded(canvas!, 2048);
    const resizedImageUrl = resizedCanvas.toDataURL();
    const request: UpscaleRequest = {
      dataUrl: resizedImageUrl,
      scale,
      provider: "standard"
    };
    
    $modalStore[0].response!(request);
    modalStore.close();
  }

  $: if (canvas && scale) {
    updateTargetDimensions();
  }

  onMount(() => {
    canvas = $modalStore[0].meta.canvas;
    updateTargetDimensions();
  });
</script>

<div class="card p-4 w-modal shadow-xl">
  <header class="card-header">
    <h2>{$_('generator.imageUpscale')}</h2>
  </header>
  
  <section class="p-4">
    <div class="grid grid-cols-1 gap-4">
      <div class="preview-image">
        <img 
          src={canvas?.toDataURL()}
          alt="Source" 
          class="w-full h-64 object-contain"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h3>{$_('generator.currentSize')}</h3>
          <p class="mx-4">{canvas?.width || 0} x {canvas?.height || 0}</p>
        </div>
        <div>
          <h3>{$_('generator.sizeAfterConversion')}</h3>
          <p class="mx-4">{targetWidth} x {targetHeight}</p>
        </div>
      </div>
    </div>
  </section>

  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>
      {$_('generator.cancel')}
    </button>
    <button class="btn variant-filled-primary flex flex-row gap-2" on:click={onSubmit}>
      <span class="generate-text">{$_('generator.execute')}</span><FeathralCost cost={scale === "2x" ? 1 : 4}/>
    </button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  h3 { 
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-top: 8px;
  }
  button .generate-text {
    font-family: '源暎エムゴ';
    font-size: 18px;
  }
</style>