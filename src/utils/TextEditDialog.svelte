<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import AutoSizeTextarea from '../notebook/AutoSizeTextarea.svelte';

  let title: string;
  let imageSource: HTMLCanvasElement;

  const minHeight = 60;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  let canvasElement: HTMLCanvasElement;
  let prompt = '';
  let placeholder = '画像の変更内容を入力してください';

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('TextEdit Dialog mounted, modal store:', args);

    if (args) {
      title = args.title;
      if (args.imageSource) {
        imageSource = args.imageSource;
        console.log('Image source:', imageSource);
        drawImageOnCanvas();
      } else {
        console.error('No image source in modal meta');
      }
    }
  });

  function drawImageOnCanvas() {
    if (!imageSource || !canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 画像のアスペクト比を保持してキャンバスに描画
    const imageAspect = imageSource.width / imageSource.height;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imageAspect > canvasAspect) {
      // 画像が横長の場合
      drawWidth = CANVAS_WIDTH;
      drawHeight = CANVAS_WIDTH / imageAspect;
      drawX = 0;
      drawY = (CANVAS_HEIGHT - drawHeight) / 2;
    } else {
      // 画像が縦長の場合
      drawWidth = CANVAS_HEIGHT * imageAspect;
      drawHeight = CANVAS_HEIGHT;
      drawX = (CANVAS_WIDTH - drawWidth) / 2;
      drawY = 0;
    }
    
    ctx.drawImage(imageSource, drawX, drawY, drawWidth, drawHeight);
  }

  function onCancel() {
    modalStore.close();
  }
  
  function onSubmit() {
    if (!imageSource || !prompt.trim()) return;

    $modalStore[0].response?.({
      image: imageSource,
      prompt: prompt
    });

    modalStore.close();
  }
</script>

<div class="card p-4 shadow-xl">
  <header class="card-header">
    <h2>{title}</h2>
  </header>
  <section class="p-4">
    <div class="canvas-container">
      <canvas
        bind:this={canvasElement}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        class="border border-surface-300 rounded"
      />
    </div>
  </section>
  <footer class="card-footer flex gap-2">
    <AutoSizeTextarea minHeight={minHeight} bind:value={prompt} placeholder={placeholder}/>
    <button class="btn variant-ghost-surface" on:click={onCancel}>キャンセル</button>
    <button class="btn variant-filled-primary" on:click={onSubmit} disabled={!prompt.trim()}>実行</button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  
  .canvas-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  canvas {
    max-width: 100%;
    max-height: 100%;
  }
</style>