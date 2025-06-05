<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  // 画像ソースはcanvas一択
  let imageSource: HTMLCanvasElement;
  let maskCanvas: HTMLCanvasElement;
  let imageCanvas: HTMLCanvasElement;
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let brushSize = 24;
  let brushColor = 'rgba(255,0,0,0.7)';

  // 画像サイズ
  let width = 512;
  let height = 512;

  // 表示用サイズ（最大800x800に収まるように）
  let styleWidth = 512;
  let styleHeight = 512;

  function updateSizes() {
    if (!imageSource) return;
    width = imageSource.width;
    height = imageSource.height;

    // 最大800x800に収める - 明示的に計算
    const MAX_SIZE = 800;
    if (width > MAX_SIZE || height > MAX_SIZE) {
      if (width >= height) {
        styleWidth = MAX_SIZE;
        styleHeight = Math.floor(height * (MAX_SIZE / width));
      } else {
        styleHeight = MAX_SIZE;
        styleWidth = Math.floor(width * (MAX_SIZE / height));
      }
    } else {
      // 800px以下ならそのまま
      styleWidth = width;
      styleHeight = height;
    }
    
    console.log(`Original: ${width}x${height}, Style: ${styleWidth}x${styleHeight}`);
    
    // canvas実サイズは元サイズのまま
    imageCanvas.width = width;
    imageCanvas.height = height;
    maskCanvas.width = width;
    maskCanvas.height = height;
  }

  function drawImageToCanvas() {
    if (!imageSource) return;
    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(imageSource, 0, 0, width, height);
  }

  onMount(() => {
    imageSource = $modalStore[0].meta.imageSource;
    updateSizes();
    drawImageToCanvas();
  });

  // ペイント処理
  function startDraw(e: MouseEvent | TouchEvent) {
    drawing = true;
    const { x, y } = getPointerPos(e);
    lastX = x;
    lastY = y;
    drawDot(x, y);
  }
  function endDraw() {
    drawing = false;
  }
  function draw(e: MouseEvent | TouchEvent) {
    if (!drawing) return;
    const { x, y } = getPointerPos(e);
    drawLine(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
  }
  function getPointerPos(e: MouseEvent | TouchEvent) {
    let rect = maskCanvas.getBoundingClientRect();
    let clientX, clientY;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    // styleサイズ→canvas座標へ変換
    const x = ((clientX - rect.left) / rect.width) * maskCanvas.width;
    const y = ((clientY - rect.top) / rect.height) * maskCanvas.height;
    return { x, y };
  }
  function drawDot(x: number, y: number) {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
    ctx.restore();
  }
  function drawLine(x0: number, y0: number, x1: number, y1: number) {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }
  function clearMask() {
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  }

  function onCancel() {
    modalStore.close();
  }
  function onSubmit() {
    // マスク画像データを返す
    $modalStore[0].response?.({
      maskDataUrl: maskCanvas.toDataURL(),
      width,
      height
    });
    modalStore.close();
  }
</script>

<div class="card p-4 w-modal shadow-xl">
  <header class="card-header">
    <h2>{$_('generator.createImageMask')}</h2>
  </header>
  <section class="p-4">
    <div class="flex flex-col items-center gap-2">
      <div
        class="canvas-container"
        style="width: {styleWidth}px; height: {styleHeight}px;"
      >
        <canvas
          bind:this={imageCanvas}
          width={width}
          height={height}
          class="image-canvas"
          style="width: {styleWidth}px; height: {styleHeight}px; pointer-events: none;"
        ></canvas>
        <canvas
          bind:this={maskCanvas}
          width={width}
          height={height}
          class="mask-canvas"
          style="width: {styleWidth}px; height: {styleHeight}px;"
          on:mousedown={startDraw}
          on:touchstart={startDraw}
          on:mousemove={draw}
          on:touchmove={draw}
          on:mouseup={endDraw}
          on:mouseleave={endDraw}
          on:touchend={endDraw}
        ></canvas>
      </div>
      <div class="flex gap-2 mt-2">
        <label>
          {$_('generator.brushSize')}
          <input type="range" min="4" max="64" bind:value={brushSize} />
        </label>
        <button class="btn variant-ghost-surface" on:click={clearMask}>{$_('generator.clearMask')}</button>
      </div>
    </div>
  </section>
  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>{$_('generator.cancel')}</button>
    <button class="btn variant-filled-primary" on:click={onSubmit}>{$_('generator.complete')}</button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  
  .canvas-container {
    position: relative;
    display: inline-block;
    box-sizing: content-box; /* 重要: ボーダーを幅に含めない */
  }
  
  canvas {
    border: 1px solid #ccc;
    background: transparent;
    display: block;
    box-sizing: border-box; /* 重要: ボーダーを幅に含める */
    position: absolute;
    left: 0;
    top: 0;
  }
  
  .image-canvas {
    z-index: 0;
  }
  
  .mask-canvas {
    z-index: 10;
  }
</style>