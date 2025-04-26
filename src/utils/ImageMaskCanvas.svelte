<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { UndoManager } from './UndoManager';
  
  // プロパティとして受け取る変数
  export let imageSource: HTMLCanvasElement;
  export let width: number;
  export let height: number;

  // 内部状態
  let eraseMode: boolean = false;
  let srcWidth = 0;
  let srcHeight = 0;
  let transformMatrix: DOMMatrix;
  let brushSize = 48;
  let minBrushSize = 16;
  let maxBrushSize = 128;
  
  // イベントディスパッチを定義（親コンポーネントに通知するため）
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    stateChange: { action?: string }; // 状態が変更されたことを通知
    maskClear: void;   // マスクがクリアされたことを通知
  }>();
  
  // UndoManager
  let undoManager: UndoManager;

  // キャンバス要素
  let maskCanvas: HTMLCanvasElement;
  let imageCanvas: HTMLCanvasElement;
  let tempCanvas: HTMLCanvasElement; // ドラッグ中の一時的な描画用
  
  // 描画状態
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let brushColor = 'rgba(255,0,0,0.7)';
  
  // 現在のストロークのパスポイント
  let currentPath: {x: number, y: number}[] = [];
  
  // imageSource/CANVAS_SIZEが変わったら初期化
  $: if (imageSource && width && height) {
    setupCanvases();
  }

  function setupCanvases() {
    srcWidth = imageSource.width;
    srcHeight = imageSource.height;

    // ブラシサイズを画像サイズの1/8（幅と高さの平均）に設定
    const avgSize = (srcWidth + srcHeight) / 2;
    brushSize = Math.floor(avgSize / 12);

    // 最小・最大値の範囲内に制限
    minBrushSize = Math.max(16, Math.floor(avgSize / 32));
    maxBrushSize = Math.min(256, Math.floor(avgSize / 4));

    // 変換行列を計算（width x heightに収まるようにスケーリング）
    const scale = Math.min(width / srcWidth, height / srcHeight);
    const offsetX = (width - srcWidth * scale) / 2;
    const offsetY = (height - srcHeight * scale) / 2;
    transformMatrix = new DOMMatrix();
    transformMatrix = transformMatrix.translate(offsetX, offsetY).scale(scale, scale);

    // キャンバス初期化
    drawImageToCanvas();

    // UndoManager初期化
    undoManager = new UndoManager(() => maskCanvas, width, height);
    setTimeout(() => {
      if (undoManager) undoManager.saveCurrentStateToHistory();
    }, 0);
  }
  
  // 外部から呼び出せるundo/redo/save/clear
  export function undo() {
    if (undoManager) {
      undoManager.undo();
      dispatch('stateChange', { action: 'undo' });
    }
  }
  export function redo() {
    if (undoManager) {
      undoManager.redo();
      dispatch('stateChange', { action: 'redo' });
    }
  }
  export function saveCurrentStateToHistory() {
    if (undoManager) {
      undoManager.saveCurrentStateToHistory();
      dispatch('stateChange', { action: 'draw' });
    }
  }
  export function clearMask() {
    if (!maskCanvas) return;
    if (undoManager) undoManager.saveCurrentStateToHistory(); // クリア前の状態を履歴に積む
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
    dispatch('maskClear');
  }

  function drawImageToCanvas() {
    if (!imageSource || !imageCanvas) return;
    
    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;
    
    // キャンバスをクリア
    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
    
    // 変換行列を適用して描画
    ctx.setTransform(transformMatrix);
    ctx.drawImage(imageSource, 0, 0, srcWidth, srcHeight);
  }
  
  // ペイント処理
  function startDraw(e: MouseEvent | TouchEvent) {
    drawing = true;
    const { x, y } = getPointerPos(e);
    lastX = x;
    lastY = y;
    
    // 新しいパスの開始
    currentPath = [{x, y}];
    
    // 一時キャンバスのクリア
    clearTempCanvas();
    
    // ドット描画（プレビュー用）
    drawDotToTemp(x, y);
  }
  
  function endDraw() {
    if (!drawing) return;
    drawing = false;
    
    // パスが集まったら、maskCanvasに一度に描画
    if (currentPath.length > 1) {
      drawPathToMask();
    } else if (currentPath.length === 1) {
      // 点だけの場合は直接ドットを描画
      const point = currentPath[0];
      drawDotToMask(point.x, point.y);
    }
    
    // 一時キャンバスのクリア
    clearTempCanvas();
    
    // パスのリセット
    currentPath = [];
    
    // 描画操作後の状態変更を通知
    if (undoManager) undoManager.saveCurrentStateToHistory();
    dispatch('stateChange', { action: 'draw' });
  }
  
  function draw(e: MouseEvent | TouchEvent) {
    if (!drawing) return;
    const { x, y } = getPointerPos(e);
    
    // パスにポイントを追加
    currentPath.push({x, y});
    
    // 一時キャンバスに現在のパスを描画（プレビュー用）
    drawCurrentPathToTemp();
    
    lastX = x;
    lastY = y;
  }
  
  function clearTempCanvas() {
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
  }
  
  function drawCurrentPathToTemp() {
    if (currentPath.length < 2) return;
    
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    // 一時キャンバスのクリア
    clearTempCanvas();
    
    // 変換行列を適用
    ctx.setTransform(transformMatrix);
    
    // パスの描画
    ctx.save();
    
    if (eraseMode) {
      // 消去モードのプレビュー（緑色の点線で表示）
      ctx.strokeStyle = "rgba(0,200,0,0.7)";
      ctx.setLineDash([5, 5]); // 点線で表示
    } else {
      // 通常の描画モード
      ctx.strokeStyle = brushColor;
    }
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  function drawPathToMask() {
    if (currentPath.length < 2) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    // 変換行列を適用
    ctx.setTransform(transformMatrix);
    
    // 滑らかな線を描画
    ctx.save();
    
    if (eraseMode) {
      // 消去モード: 既存のピクセルを消去
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)"; // 完全な不透明度で消去
    } else {
      // 描画モード: 通常の描画
      ctx.strokeStyle = brushColor;
    }
    
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    
    // パスを滑らかに描画
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  function getPointerPos(e: MouseEvent | TouchEvent) {
    if (!transformMatrix) return { x: 0, y: 0 };
    
    let rect = tempCanvas.getBoundingClientRect();
    let clientX, clientY;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    // クライアント座標をcanvas内の位置に変換
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    // 変換行列の逆行列を使って、画面上の座標を元画像の座標に変換
    const inverseMatrix = transformMatrix.inverse();
    const point = new DOMPoint(canvasX, canvasY).matrixTransform(inverseMatrix);
    
    return { x: point.x, y: point.y };
  }
  
  function drawDotToTemp(x: number, y: number) {
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    // 変換行列を適用
    ctx.setTransform(transformMatrix);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    
    if (eraseMode) {
      // 消去モードのプレビュー（緑色の点線で表示）
      ctx.fillStyle = "rgba(0,200,0,0.4)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,200,0,0.7)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
    } else {
      // 通常の描画モード
      ctx.fillStyle = brushColor;
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  function drawDotToMask(x: number, y: number) {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    // 変換行列を適用
    ctx.setTransform(transformMatrix);
    
    ctx.save();
    
    if (eraseMode) {
      // 消去モード: 既存のピクセルを消去
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)"; // 完全な不透明度で消去
    } else {
      // 描画モード: 通常の描画
      ctx.fillStyle = brushColor;
    }
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  
  // 親コンポーネントから利用できるようにエクスポート
  export function getMaskCanvas(): HTMLCanvasElement {
    return maskCanvas;
  }

  export function getImageInfo() {
    return {
      srcWidth,
      srcHeight,
      transformMatrix
    };
  }

  // Dialogから呼び出す用: 元画像サイズに合わせた最終マスクCanvasを返す
  export function getFinalMaskCanvas(): HTMLCanvasElement | null {
    if (!maskCanvas || !srcWidth || !srcHeight || !width || !height) return null;

    // 一時キャンバス（マスク取得用）
    const tempMaskCanvas = document.createElement('canvas');
    tempMaskCanvas.width = width;
    tempMaskCanvas.height = height;
    const tempMaskCtx = tempMaskCanvas.getContext('2d');

    // 最終出力用のキャンバス（元画像と同じサイズ）
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = srcWidth;
    finalCanvas.height = srcHeight;
    const finalCtx = finalCanvas.getContext('2d');

    if (!tempMaskCtx || !finalCtx) return null;

    // まず現在のマスクを一時キャンバスにコピー（変換なし）
    tempMaskCtx.drawImage(maskCanvas, 0, 0);

    // 変換行列の逆変換を計算
    const scale = Math.min(width / srcWidth, height / srcHeight);
    const offsetX = (width - srcWidth * scale) / 2;
    const offsetY = (height - srcHeight * scale) / 2;

    // 最終キャンバスにマスクを適切に描画
    finalCtx.setTransform(1, 0, 0, 1, 0, 0);
    finalCtx.drawImage(
      tempMaskCanvas,
      offsetX, offsetY,
      srcWidth * scale,
      srcHeight * scale,
      0, 0,
      srcWidth, srcHeight
    );

    return finalCanvas;
  }
  // キーボードショートカット対応
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      redo();
    }
  }
</script>

<div class="canvas-container" style="width: {width}px; height: {height}px;">
  <canvas
    bind:this={imageCanvas}
    width={width}
    height={height}
    class="image-canvas"
  ></canvas>
  <canvas
    bind:this={maskCanvas}
    width={width}
    height={height}
    class="mask-canvas"
  ></canvas>
  <canvas
    bind:this={tempCanvas}
    width={width}
    height={height}
    class="temp-canvas"
    on:mousedown={startDraw}
    on:touchstart={startDraw}
    on:mousemove={draw}
    on:touchmove={draw}
    on:mouseup={endDraw}
    on:mouseleave={endDraw}
    on:touchend={endDraw}
  ></canvas>
</div>

<div class="flex items-center justify-center gap-4 mt-4">
  <label class="flex items-center">
    <span class="mr-2 w-32">ブラシサイズ</span>
    <input type="range" min={minBrushSize} max={maxBrushSize} bind:value={brushSize} />
  </label>
  <div class="flex gap-2">
    <button
      class="btn {eraseMode ? 'variant-filled-tertiary' : 'variant-ghost-surface'}"
      on:click={() => eraseMode = !eraseMode}
      title={eraseMode ? "描画モードに切替" : "消去モードに切替"}
    >
      <span class="text-lg">{eraseMode ? '🖌️' : '🧽'}</span>
    </button>
    <button class="btn variant-ghost-surface" on:click={undo} title="元に戻す (Ctrl+Z)">
      <span class="text-lg">↩</span>
    </button>
    <button class="btn variant-ghost-surface" on:click={redo} title="やり直し (Ctrl+Y)">
      <span class="text-lg">↪</span>
    </button>
    <button class="btn variant-ghost-surface" on:click={clearMask}>マスク消去</button>
  </div>
</div>

<style>
  .canvas-container {
    background: white;
    position: relative;
  }
  
  canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .image-canvas {
    z-index: 0;
  }
  
  .mask-canvas {
    z-index: 1;
    pointer-events: none;
  }
  
  .temp-canvas {
    z-index: 2;
  }
</style>