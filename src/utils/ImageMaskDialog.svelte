<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

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
    ctx.strokeStyle = brushColor;
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
    ctx.strokeStyle = brushColor;
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
    ctx.fillStyle = brushColor;
    ctx.fill();
    ctx.restore();
  }
  
  function drawDotToMask(x: number, y: number) {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    // 変換行列を適用
    ctx.setTransform(transformMatrix);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
    ctx.restore();
  }
  
  function clearMask() {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.resetTransform();
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  function onCancel() {
    modalStore.close();
  }
  
  function onSubmit() {
    // マスク画像をオリジナルサイズで取得するための一時キャンバス
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = srcWidth;
    finalCanvas.height = srcHeight;
    const finalCtx = finalCanvas.getContext('2d');
    
    if (finalCtx) {
      // マスク内容を適切なサイズにレンダリング
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        // マスクからデータを取得
        maskCtx.resetTransform();
        maskCtx.setTransform(transformMatrix);
        
        finalCtx.drawImage(maskCanvas, 0, 0, srcWidth, srcHeight);
      }
      
      // マスク画像データを返す
      $modalStore[0].response?.({
        maskDataUrl: finalCanvas.toDataURL(),
        width: srcWidth,
        height: srcHeight
      });
    }
    
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
      <button class="btn variant-ghost-surface" on:click={clearMask}>マスク消去</button>
    </div>
  </section>
  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>キャンセル</button>
    <button class="btn variant-filled-primary" on:click={onSubmit}>完了</button>
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
