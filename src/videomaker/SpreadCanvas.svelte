<script lang="ts">
  import { onMount, tick } from 'svelte';
  import wallPaper from '../assets/wallpaper.jpg';

  export let canvas: HTMLCanvasElement;
  export let width: number;
  export let height: number;

  let containerWidth: number;
  let containerHeight: number;
  let displayWidth: number;
  let displayHeight: number;

  const img = new Image();
  img.src = wallPaper;

  $:onChangeContainerSize(containerWidth, containerHeight, width, height);
  async function onChangeContainerSize(w: number, h: number, bw: number, bh: number) {
    if (!w || !h) return;
    // 基本はwidth/heightの通りにする。
    // ただしどちらかがcontainerより大きい場合はアスペクト比を維持して縮小する。
    displayWidth = width;
    displayHeight = height;
    const aspectRatio = width / height;
    if (width > w) {
      displayWidth = w;
      displayHeight = w / aspectRatio;
    }
    if (displayHeight > h) {
      displayHeight = h;
      displayWidth = h * aspectRatio;
    }
    await tick();
    // drawImage();
  }

  function drawImage() {
    if (!canvas) {return;}
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  }

  onMount(() => {
    drawImage();
  });
</script>

<div class="panel" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <div class="canvas-container" style="width: {displayWidth}px; height: {displayHeight}px;">
    <canvas width={width} height={height} bind:this={canvas} style="width: {displayWidth}px; height: {displayHeight}px;"/>
  </div>    
</div>

<style>
  .panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .canvas-container {
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
  }
  canvas {
    width: 100%;
    height: 100%;
  }
</style>