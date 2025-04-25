<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount, onDestroy } from 'svelte';
  import ImageMaskCanvas from './ImageMaskCanvas.svelte';

  let title: string;
  let imageSource: HTMLCanvasElement;
  
  const CANVAS_SIZE = 800;
  
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
    
    window.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
  
  // キーボードショートカットの処理
  function handleKeydown(e: KeyboardEvent) {
    if (!maskCanvasComponent) return;
    // Ctrl+Z: アンドゥ
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      maskCanvasComponent.undo();
    }

    // Ctrl+Shift+Z または Ctrl+Y: リドゥ
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      maskCanvasComponent.redo();
    }
  }

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
      {CANVAS_SIZE}
    />
  </section>
  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>キャンセル</button>
    <button class="btn variant-filled-primary" on:click={onSubmit}>実行</button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
</style>
