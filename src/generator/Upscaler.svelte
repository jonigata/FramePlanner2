<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import type { UpscaleRequest } from '../utils/edgeFunctions/types/imagingTypes';
  import { onMount } from 'svelte';
  import { resizeCanvasIfNeeded } from '../lib/layeredCanvas/tools/imageUtil';
  import FeathralCost from '../utils/FeathralCost.svelte';
  import type { Media } from '../lib/layeredCanvas/dataModels/media';
  
  let sourceMedia: Media;
  let scale: "2x" | "4x" = "2x";
  let targetWidth = 0;
  let targetHeight = 0;
  
  function onCancel() {
    modalStore.close();
  }

  function updateTargetDimensions() {
    if (!sourceMedia) return;
    
    const scaleFactor = scale === "2x" ? 2 : 4;
    targetWidth = sourceMedia.drawSourceCanvas.width * scaleFactor;
    targetHeight = sourceMedia.drawSourceCanvas.height * scaleFactor;
  }

  async function onSubmit() {
    const resizedCanvas = resizeCanvasIfNeeded(sourceMedia.drawSourceCanvas, 1024);
    const resizedImageUrl = resizedCanvas.toDataURL();
    const request: UpscaleRequest = {
      dataUrl: resizedImageUrl,
      scale,
      provider: "standard"
    };
    
    $modalStore[0].response!(request);
    modalStore.close();
  }

  onMount(() => {
    sourceMedia = $modalStore[0].meta.media;
    updateTargetDimensions();
  });

  $: if (sourceMedia && scale) {
    updateTargetDimensions();
  }
</script>

<div class="card p-4 w-modal shadow-xl">
  <header class="card-header">
    <h2>画像アップスケール</h2>
  </header>
  
  <section class="p-4">
    <div class="grid grid-cols-1 gap-4">
      <div class="preview-image">
        <img 
          src={sourceMedia?.drawSourceCanvas.toDataURL()}
          alt="Source" 
          class="w-full h-64 object-contain"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h3>現在のサイズ</h3>
          <p class="mx-4">{sourceMedia?.drawSourceCanvas.width || 0} x {sourceMedia?.drawSourceCanvas.height || 0}</p>
        </div>
        <div>
          <h3>変換後のサイズ</h3>
          <p class="mx-4">{targetWidth} x {targetHeight}</p>
        </div>
      </div>
    </div>
  </section>

  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>
      キャンセル
    </button>
    <button class="btn variant-filled-primary flex flex-row gap-2" on:click={onSubmit}>
      <span class="generate-text">実行</span><FeathralCost cost={scale === "2x" ? 1 : 4}/>
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