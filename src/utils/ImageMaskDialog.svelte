<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import ImageMaskCanvas from './ImageMaskCanvas.svelte';
  import { _ } from 'svelte-i18n';

  let title: string;
  let imageSource: HTMLCanvasElement;
  
  
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  let maskCanvasComponent: ImageMaskCanvas;

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('Dialog mounted, modal store:', args);

    if (args) {
      title = args.title;
      if (args.imageSource) {
        imageSource = args.imageSource;
        console.log('Image source:', imageSource);
      } else {
        console.error('No image source in modal meta');
      }
    }
    
  });

  function onCancel() {
    modalStore.close();
  }
  
  function onSubmit() {
    if (!maskCanvasComponent) return;
    const finalCanvas = maskCanvasComponent.getFinalMaskCanvas();
    if (!finalCanvas) return;

    $modalStore[0].response?.({
      mask: finalCanvas,
      image: imageSource,
    });

    modalStore.close();
  }
</script>

<div class="card p-4 shadow-xl">
  <header class="card-header">
    <h2>{title}</h2>
  </header>
  <section class="p-4">
    <ImageMaskCanvas
      bind:this={maskCanvasComponent}
      {imageSource}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
  </section>
  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>{$_('dialogs.cancel')}</button>
    <button class="btn variant-filled-primary" on:click={onSubmit}>{$_('dialogs.execute')}</button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
</style>
