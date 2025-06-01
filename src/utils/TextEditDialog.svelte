<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import AutoSizeTextarea from '../notebook/AutoSizeTextarea.svelte';

  import MangaBlackPicture from '../assets/kontext/manga-black.webp';
  import MangaGrayPicture from '../assets/kontext/manga-gray.webp';

  let title: string;
  let imageSource: HTMLCanvasElement;

  const minHeight = 60;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  let canvasElement: HTMLCanvasElement;
  let prompt = '';
  let placeholder = '画像の変更内容を入力してください';
  
  // 画像リスト用のサンプルデータ
  let imageList: Array<{id: string, url: string, name: string, prompt: string}> = [];

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
    
    // サンプル画像データを追加
    imageList = [
      { id: '1', url: MangaBlackPicture, name: 'まんがブラック', prompt: 'Convert to sharp monochrome contour line art, frontal lighting, flat discrete cel shading' },
      { id: '2', url: MangaGrayPicture, name: 'まんがグレー', prompt: 'Convert to sharp monochrome contour line art, flat shading using gray' },
    ];
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
  
  function onImageSelect(selectedImage: {id: string, url: string, name: string, prompt: string}) {
    console.log('Selected image:', selectedImage);
    // 選択された画像のプロンプトをテキストエリアに設定
    prompt = selectedImage.prompt;
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
    <div class="main-content-container">
      <div class="left-pane">
        <div class="canvas-container">
          <canvas
            bind:this={canvasElement}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            class="border border-surface-300 rounded"
          />
        </div>
      </div>
      <div class="right-pane">
        <div class="right-pane-content">
          <h3>指示テンプレート</h3>
          <div class="image-list">
            {#each imageList as image (image.id)}
              <div class="image-item" on:click={() => onImageSelect(image)} on:keydown={(e) => e.key === 'Enter' && onImageSelect(image)} tabindex="0" role="button">
                <img src={image.url} alt={image.name} class="image-thumbnail" />
                <div class="image-name">{image.name}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
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
  
  .main-content-container {
    display: flex;
    gap: 16px;
    height: 600px;
  }
  
  .left-pane {
    flex: 2;
    display: flex;
    flex-direction: column;
  }
  
  .right-pane {
    flex: 1;
    border-left: 1px solid rgb(var(--color-surface-300));
    padding-left: 16px;
    overflow-y: auto;
    max-height: 600px;
  }
  
  .right-pane-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .right-pane h3 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin: 0 0 8px 0;
    color: rgb(var(--color-primary-500));
  }
  
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .setting-item label {
    font-weight: 600;
    font-size: 14px;
    color: rgb(var(--color-surface-700));
  }
  
  .image-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .image-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 8px;
    background: rgb(var(--color-surface-50));
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .image-item:hover {
    background: rgb(var(--color-surface-100));
    border-color: rgb(var(--color-primary-400));
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .image-item:focus {
    outline: 2px solid rgb(var(--color-primary-500));
    outline-offset: 2px;
  }
  
  .image-thumbnail {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid rgb(var(--color-surface-300));
    flex-shrink: 0;
  }
  
  .image-name {
    font-size: 14px;
    font-weight: 500;
    color: rgb(var(--color-surface-700));
    text-align: center;
    width: 100%;
  }
  
  .canvas-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
  }
  
  canvas {
    max-width: 100%;
    max-height: 100%;
  }
</style>