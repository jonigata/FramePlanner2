<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount, onDestroy } from 'svelte';
  import ImageMaskCanvas from './ImageMaskCanvas.svelte';

  let title: string;
  let imageSource: HTMLCanvasElement;
  
  // Undo/RedoはImageMaskCanvas側で管理
  const MAX_HISTORY = 20; // 履歴の最大数
  
  // Canvas固定サイズ
  const CANVAS_SIZE = 800;
  let eraseMode = false;
  
  // ImageMaskCanvasコンポーネントへの参照
  let maskCanvasComponent: ImageMaskCanvas;
  let maskCanvas: HTMLCanvasElement;


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
  
  // マスクキャンバスコンポーネント参照を監視
  $: if (maskCanvasComponent) {
    maskCanvas = maskCanvasComponent.getMaskCanvas();
  }
  
  // 描画状態変更イベントの処理
  function handleStateChange(event: CustomEvent<{action?: string}>) {
    // ここでは特に何もしない（必要ならロギング等）
  }

  // マスククリアイベントの処理
  function handleMaskClear() {
    // ここでは何もしない（無限ループ防止）
  }

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
    const maskCanvas = maskCanvasComponent.getMaskCanvas();
    const { srcWidth, srcHeight } = maskCanvasComponent.getImageInfo();

    // 一時キャンバスの作成（マスク取得用）
    const tempMaskCanvas = document.createElement('canvas');
    tempMaskCanvas.width = CANVAS_SIZE;
    tempMaskCanvas.height = CANVAS_SIZE;
    const tempMaskCtx = tempMaskCanvas.getContext('2d');

    // 最終出力用のキャンバス（元画像と同じサイズ）
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = srcWidth;
    finalCanvas.height = srcHeight;
    const finalCtx = finalCanvas.getContext('2d');

    if (!tempMaskCtx || !finalCtx) return;

    // まず現在のマスクを一時キャンバスにコピー（変換なし）
    tempMaskCtx.drawImage(maskCanvas, 0, 0);

    // 変換行列の逆変換を計算
    const scale = Math.min(CANVAS_SIZE / srcWidth, CANVAS_SIZE / srcHeight);
    const offsetX = (CANVAS_SIZE - srcWidth * scale) / 2;
    const offsetY = (CANVAS_SIZE - srcHeight * scale) / 2;

    // 最終キャンバスにマスクを適切に描画
    finalCtx.setTransform(
      1, 0, 0, 1, 0, 0
    );

    // マスクの描画領域を計算
    // (プレビュー表示されている実際のマスク領域のみを抽出)
    finalCtx.drawImage(
      tempMaskCanvas,           // ソース
      offsetX, offsetY,         // ソースの開始位置
      srcWidth * scale,         // ソースの幅
      srcHeight * scale,        // ソースの高さ
      0, 0,                     // 出力位置
      srcWidth, srcHeight       // 出力サイズ（元の画像と同じ）
    );

    console.log(`Final mask size: ${finalCanvas.width}x${finalCanvas.height}`);

    // マスク画像データを返す
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
      {eraseMode}
      on:stateChange={handleStateChange}
      on:maskClear={handleMaskClear}
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
