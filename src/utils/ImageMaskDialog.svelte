<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount, onDestroy } from 'svelte';

  // 画像ソースはcanvas一択
  let imageSource: HTMLCanvasElement;
  let maskCanvas: HTMLCanvasElement;
  let imageCanvas: HTMLCanvasElement;
  let tempCanvas: HTMLCanvasElement; // ドラッグ中の一時的な描画用
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let brushSize = 48; // 初期値は仮設定、後でsrcWidthとsrcHeightに基づいて更新
  let brushColor = 'rgba(255,0,0,0.7)';
  let eraseMode = false; // 消去モードフラグ
  
  // アンドゥ・リドゥ用の状態管理
  let history: ImageData[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 20; // 履歴の最大数
  
  // ブラシサイズの範囲
  let minBrushSize = 16;
  let maxBrushSize = 128;
  
  // 現在のストロークのパスポイント
  let currentPath: {x: number, y: number}[] = [];

  // 元画像サイズ
  let srcWidth = 0;
  let srcHeight = 0;
  
  // Canvas固定サイズ
  const CANVAS_SIZE = 800;
  
  // 変換行列
  let transformMatrix: DOMMatrix;

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
    
    // 元画像を表示
    drawImageToCanvas();
    
    // 初期状態を履歴に追加（空のキャンバス）
    saveCurrentStateToHistory();
  }

  function drawImageToCanvas() {
    if (!imageSource || !imageCanvas) return;
    
    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;
    
    // キャンバスをクリア
    ctx.resetTransform();
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // 変換行列を適用して描画
    ctx.setTransform(transformMatrix);
    ctx.drawImage(imageSource, 0, 0, srcWidth, srcHeight);
  }

  onMount(() => {
    console.log('Dialog mounted, modal store:', $modalStore[0]?.meta);
    if ($modalStore[0]?.meta?.imageSource) {
      imageSource = $modalStore[0].meta.imageSource;
      console.log('Image source:', imageSource);
      setupCanvases();
    } else {
      console.error('No image source in modal meta');
    }
  });

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
    
    // 描画操作後の状態を履歴に保存
    saveCurrentStateToHistory();
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
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
  
  function clearMask() {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.resetTransform();
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // クリア操作後の状態を履歴に保存
    saveCurrentStateToHistory();
  }
  
  // 現在のマスクキャンバスの状態を履歴に保存
  function saveCurrentStateToHistory() {
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
  
  // キーボードイベントの設定
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  function onCancel() {
    modalStore.close();
  }
  
  function onSubmit() {
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
    <h2>画像マスク作成</h2>
  </header>
  <section class="p-4">
    <div class="flex items-center justify-center">
      <div class="canvas-container">
        <canvas
          bind:this={imageCanvas}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          class="image-canvas"
        ></canvas>
        <canvas
          bind:this={maskCanvas}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          class="mask-canvas"
        ></canvas>
        <canvas
          bind:this={tempCanvas}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
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
        <button class="btn variant-ghost-surface" on:click={undo} disabled={historyIndex <= 0} title="元に戻す (Ctrl+Z)">
          <span class="text-lg">↩</span>
        </button>
        <button class="btn variant-ghost-surface" on:click={redo} disabled={historyIndex >= history.length - 1} title="やり直し (Ctrl+Y)">
          <span class="text-lg">↪</span>
        </button>
        <button class="btn variant-ghost-surface" on:click={clearMask}>マスク消去</button>
      </div>
    </div>
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
  
  .canvas-container {
    width: 800px;
    height: 800px;
    background: white;
    position: relative;
  }
  
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 800px;
    height: 800px;
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
