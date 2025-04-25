<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount, onDestroy } from 'svelte';
  import ImageMaskCanvas from './ImageMaskCanvas.svelte';

  let title: string;
  let imageSource: HTMLCanvasElement;
  
  // アンドゥ・リドゥ用の状態管理
  let history: ImageData[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 20; // 履歴の最大数
  
  // 元画像サイズ
  let srcWidth = 0;
  let srcHeight = 0;
  
  // Canvas固定サイズ
  const CANVAS_SIZE = 800;
  
  // 変換行列
  let transformMatrix: DOMMatrix;
  
  // ブラシサイズと消去モード
  let brushSize = 48;
  let eraseMode = false;
  let minBrushSize = 16;
  let maxBrushSize = 128;
  
  // ImageMaskCanvasコンポーネントへの参照
  let maskCanvasComponent: ImageMaskCanvas;
  let maskCanvas: HTMLCanvasElement;

  function setupCanvases() {
    if (!imageSource) return;
    
    // 元画像のサイズを取得
    srcWidth = imageSource.width;
    srcHeight = imageSource.height;
    
    console.log(`Original image: ${srcWidth}x${srcHeight}`);
    
    // ブラシサイズを画像サイズの1/8（幅と高さの平均）に設定
    const avgSize = (srcWidth + srcHeight) / 2;
    brushSize = Math.floor(avgSize / 12);
    
    // 最小・最大値の範囲内に制限
    minBrushSize = Math.max(16, Math.floor(avgSize / 32));
    maxBrushSize = Math.min(256, Math.floor(avgSize / 4));
    
    console.log(`Brush size set to: ${brushSize} (range: ${minBrushSize}-${maxBrushSize})`);
    
    // 変換行列を計算（800x800に収まるようにスケーリング）
    const scale = Math.min(CANVAS_SIZE / srcWidth, CANVAS_SIZE / srcHeight);
    
    // 中央配置用のオフセット計算
    const offsetX = (CANVAS_SIZE - srcWidth * scale) / 2;
    const offsetY = (CANVAS_SIZE - srcHeight * scale) / 2;
    
    // 変換行列を作成
    transformMatrix = new DOMMatrix();
    transformMatrix = transformMatrix.translate(offsetX, offsetY).scale(scale, scale);
    
    console.log(`Scale: ${scale}, Offset: ${offsetX},${offsetY}`);
  }

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('Dialog mounted, modal store:', args);

    if (args) {
      title = args.title;
      if (args.imageSource) {
        imageSource = args.imageSource;
        console.log('Image source:', imageSource);
        setupCanvases();
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
    // 初期状態を履歴に追加（空のキャンバス）
    saveCurrentStateToHistory();
  }
  
  // 描画状態変更イベントの処理
  function handleStateChange(event: CustomEvent<{action?: string}>) {
    const action = event.detail.action;
    
    // アクションに応じた処理
    if (action === 'undo') {
      undo();
    } else if (action === 'redo') {
      redo();
    } else {
      // その他の状態変更（描画など）
      saveCurrentStateToHistory();
    }
  }
  
  // マスククリアイベントの処理
  function handleMaskClear() {
    saveCurrentStateToHistory();
  }
  
  // 現在のマスクキャンバスの状態を履歴に保存
  function saveCurrentStateToHistory() {
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    // 現在のインデックスより後の履歴を削除（アンドゥ後に新しい操作をした場合）
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    
    // 履歴に現在の状態を追加
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    history.push(imageData);
    
    // 履歴の最大数を超えた場合、古い履歴を削除
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    
    // 現在のインデックスを更新
    historyIndex = history.length - 1;
    
    console.log(`History saved: ${historyIndex + 1}/${history.length}`);
  }
  
  // アンドゥ: 1つ前の状態に戻す
  function undo() {
    if (historyIndex <= 0) return; // これ以上戻れない
    
    historyIndex--;
    restoreState();
    
    console.log(`Undo: ${historyIndex + 1}/${history.length}`);
  }
  
  // リドゥ: 取り消した操作をやり直す
  function redo() {
    if (historyIndex >= history.length - 1) return; // これ以上進めない
    
    historyIndex++;
    restoreState();
    
    console.log(`Redo: ${historyIndex + 1}/${history.length}`);
  }
  
  // 指定したインデックスの状態を復元
  function restoreState() {
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx || historyIndex < 0 || historyIndex >= history.length) return;
    
    ctx.resetTransform();
    ctx.putImageData(history[historyIndex], 0, 0);
  }
  
  // キーボードショートカットの処理
  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+Z: アンドゥ
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    
    // Ctrl+Shift+Z または Ctrl+Y: リドゥ
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      redo();
    }
  }

  function onCancel() {
    modalStore.close();
  }
  
  function onSubmit() {
    if (!maskCanvas) return;
    
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
    {#if transformMatrix}
      <ImageMaskCanvas
        bind:this={maskCanvasComponent}
        {imageSource}
        {transformMatrix}
        {srcWidth}
        {srcHeight}
        {CANVAS_SIZE}
        bind:brushSize
        bind:eraseMode
        {minBrushSize}
        {maxBrushSize}
        on:stateChange={handleStateChange}
        on:maskClear={handleMaskClear}
      />
    {:else}
      <div class="flex items-center justify-center h-80">
        <p>画像を読み込み中...</p>
      </div>
    {/if}
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
