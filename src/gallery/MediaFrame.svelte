<script lang="ts">
  import { redrawToken } from '../bookeditor/workspaceStore';
  import { type Media, isMissingMediaReference } from "../lib/layeredCanvas/dataModels/media";
  import { canvasToBlob, computeAspectFitSize } from "../lib/layeredCanvas/tools/imageUtil";
  import { onMount, onDestroy } from 'svelte';

  export let media: Media;
  export let showControls: boolean = true;
  // 画像は<img>で表示してブラウザ標準ドラッグを有効化するか（trueで<img>）
  export let dragAsImage: boolean = true;
  // 親コンポーネントにシークバー操作状態を伝える
  export let isSeekingGlobal: boolean = false;

  // ビデオコントロール用の変数
  let videoElement: HTMLVideoElement | null = null;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  let isSeekbarDragging = false;

  function getVideoSource(media: Media) {
    return (media.drawSource as HTMLVideoElement).src;
  }

  let canvas: HTMLCanvasElement;
  let containerDiv: HTMLDivElement;
  let imgElement: HTMLImageElement;
  let imageDataUrl: string | null = null; // imgモード用
  let isMissing = false;
  let computedWidth: number | null = null;
  let computedHeight: number | null = null;

  // iOS Safari向けベンダー属性を型安全に付与するためのアクション
  function webkitPlaysinline(node: HTMLVideoElement) {
    node.setAttribute('webkit-playsinline', '');
    return {
      destroy() {
        node.removeAttribute('webkit-playsinline');
      }
    };
  }

  function updateComputedSize() {
    if (!media || !containerDiv) return;
    const rect = containerDiv.getBoundingClientRect();
    const [mediaWidth, mediaHeight] = media.size;
    if (rect && mediaWidth > 0 && mediaHeight > 0) {
      const { width: targetWidth, height: targetHeight } = computeAspectFitSize(rect, media.size);
      computedWidth = targetWidth;
      computedHeight = targetHeight;
      const controlWidth = Math.max(targetWidth, 1);
      const controlScale = Math.min(1, Math.max(0.35, controlWidth / 480));
      containerDiv.style.setProperty('--media-controls-scale', controlScale.toString());
    } else {
      const fallbackScale = Math.min(1, Math.max(0.35, rect.width / 480));
      containerDiv?.style.setProperty('--media-controls-scale', fallbackScale.toString());
    }
  }

  function drawFrame() {
    if (!media) return;

    updateComputedSize();

    if (canvas && computedWidth && computedHeight) {
      canvas.style.width = `${computedWidth}px`;
      canvas.style.height = `${computedHeight}px`;
    }

    if (!canvas) return;

    if (canvas.width !== media.size[0] || canvas.height !== media.size[1]) {
      canvas.width = media.size[0];
      canvas.height = media.size[1];
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sourceCanvas = media.drawSourceCanvas; // ローディング/失敗時はフォールバックが返る
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);
  }
  // 画像の<img>表示用URL更新
  async function updateImageUrlIfNeeded() {
    if (!media) return;
    if (!dragAsImage) return; // imgモードでないなら不要
    if (media.type !== 'image') return;
    if (!media.isLoaded) return; // ローディング/失敗はキャンバス
    const blob = await canvasToBlob(media.drawSourceCanvas);
    const url = URL.createObjectURL(blob);
    if (imageDataUrl) URL.revokeObjectURL(imageDataUrl);
    imageDataUrl = url;
  }

  // メディア変化・ロード完了・外部再描画トリガで更新
  let lastMediaForUrl: Media | null = null;
  let lastLoadedForUrl = false;
  $: if (media && (media !== lastMediaForUrl || media.isLoaded !== lastLoadedForUrl)) {
    lastMediaForUrl = media;
    lastLoadedForUrl = media.isLoaded;
    updateImageUrlIfNeeded();
  }
  $: if ($redrawToken) { updateImageUrlIfNeeded(); }
  onDestroy(() => { if (imageDataUrl) URL.revokeObjectURL(imageDataUrl); });

  $: isMissing = media ? isMissingMediaReference(media.persistentSource) : false;

  // メディアが変わったら一度描画（以降はrAF）
  let lastMediaForDraw: Media | null = null;
  $: if (media && media !== lastMediaForDraw) {
    lastMediaForDraw = media;
    drawFrame();
  }
  // img/video用のサイズ更新（canvasを使わないとき）
  $: if (media && containerDiv && !usingCanvasNow()) { updateComputedSize(); }

  // コンテナのリサイズに対応
  let resizeObserver: ResizeObserver | null = null;
  function setupResizeObserver(node: HTMLDivElement) {
    resizeObserver = new ResizeObserver(() => {
      if (usingCanvasNow()) {
        drawFrame();
      } else {
        updateComputedSize();
      }
    });
    resizeObserver.observe(node);
    return {
      destroy() {
        resizeObserver?.disconnect();
        resizeObserver = null;
      }
    };
  }

  // ローディングスピナーのアニメーション更新
  let rafId: number | null = null;
  function startRaf() {
    if (rafId != null) return;
    const loop = () => {
      drawFrame();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }
  function stopRaf() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  // シンプルに、キャンバスを使う表示であれば常にrAFで再描画
  function usingCanvasNow(): boolean {
    if (!media) return false;
    // 実体のある動画は<video>
    if (media.type === 'video' && media.drawSource instanceof HTMLVideoElement) return false;
    // 画像で、imgドラッグを有効にしていて、ロード完了なら<img>
    if (media.type === 'image' && dragAsImage && media.isLoaded) return false;
    // それ以外はキャンバス描画
    return true;
  }
  $: usingCanvasNow() ? startRaf() : stopRaf();
  onMount(() => { if (usingCanvasNow()) startRaf(); });
  onDestroy(() => { stopRaf(); });

  // ビデオコントロール関数
  function togglePlay() {
    if (!videoElement) return;
    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
  }

  function handleTimeUpdate() {
    if (!videoElement || isSeekbarDragging) return;
    currentTime = videoElement.currentTime;
    duration = videoElement.duration;
  }

  function handlePlayPause() {
    if (!videoElement) return;
    isPlaying = !videoElement.paused;
  }

  function handleSeekStart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isSeekbarDragging = true;
    isSeekingGlobal = true;
    handleSeek(e);
  }

  function handleSeek(e: MouseEvent) {
    if (!videoElement || !isSeekbarDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const seekbar = e.currentTarget as HTMLElement;
    const rect = seekbar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    videoElement.currentTime = newTime;
    currentTime = newTime;
  }

  function handleSeekEnd(e?: MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    isSeekbarDragging = false;
    isSeekingGlobal = false;
  }

  function formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ビデオ要素がマウントされたときの初期化
  function initVideo(node: HTMLVideoElement) {
    videoElement = node;
    node.addEventListener('timeupdate', handleTimeUpdate);
    node.addEventListener('play', handlePlayPause);
    node.addEventListener('pause', handlePlayPause);
    node.addEventListener('loadedmetadata', () => {
      duration = node.duration;
      currentTime = node.currentTime;
      drawFrame();
    });
    // 音声を常にミュート
    node.muted = true;

    return {
      destroy() {
        node.removeEventListener('timeupdate', handleTimeUpdate);
        node.removeEventListener('play', handlePlayPause);
        node.removeEventListener('pause', handlePlayPause);
        videoElement = null;
      }
    };
  }

  // グローバルなマウスイベントリスナー
  onMount(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSeekbarDragging) {
        e.preventDefault();
        e.stopPropagation();
        const seekbar = document.querySelector('.custom-seekbar') as HTMLElement;
        if (seekbar) {
          const rect = seekbar.getBoundingClientRect();
          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          if (videoElement) {
            const newTime = percent * duration;
            videoElement.currentTime = newTime;
            currentTime = newTime;
          }
        }
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isSeekbarDragging) {
        e.stopPropagation();
        isSeekbarDragging = false;
        isSeekingGlobal = false;
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, true);
    window.addEventListener('mouseup', handleGlobalMouseUp, true);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove, true);
      window.removeEventListener('mouseup', handleGlobalMouseUp, true);
    };
  });
</script>

<div class="media-frame" bind:this={containerDiv} use:setupResizeObserver>
  {#if media.type === 'video' && media.drawSource instanceof HTMLVideoElement}
    <!-- 読み込み完了: ネイティブvideoを表示 -->
    <div class="video-container">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video
        src={getVideoSource(media)}
        controls={false}
        playsinline
        use:webkitPlaysinline
        use:initVideo
        class="media-element"
        draggable="true"
        style:width={computedWidth ? `${computedWidth}px` : undefined}
        style:height={computedHeight ? `${computedHeight}px` : undefined}
        on:click
      />
      {#if showControls}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div
          class="custom-controls"
          role="presentation"
          on:click|stopPropagation
          on:mousedown|stopPropagation
          on:mouseup|stopPropagation
        >
          <!-- シークバー -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <div
            class="seekbar-container"
            role="presentation"
            on:click|stopPropagation
            on:mousedown|stopPropagation
            on:mouseup|stopPropagation
          >
            <div
              class="custom-seekbar"
              on:mousedown={handleSeekStart}
              on:click|stopPropagation
              role="slider"
              tabindex="0"
              aria-label="シークバー"
              aria-valuemin="0"
              aria-valuemax={duration}
              aria-valuenow={currentTime}
            >
              <div class="seekbar-progress" style="width: {(currentTime / duration) * 100}%"></div>
              <div class="seekbar-handle" style="left: {(currentTime / duration) * 100}%"></div>
            </div>
          </div>

          <!-- 下部コントロール -->
          <div class="control-buttons">
            <button
              class="control-btn play-btn"
              on:click|stopPropagation={togglePlay}
              aria-label={isPlaying ? '一時停止' : '再生'}
            >
              {#if isPlaying}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="5" y="4" width="3" height="12" />
                  <rect x="12" y="4" width="3" height="12" />
                </svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 4 L16 10 L6 16 Z" />
                </svg>
              {/if}
            </button>

            <span class="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    {#if dragAsImage && media.type === 'image' && media.isLoaded && imageDataUrl}
      <!-- 画像ロード完了時は<img>（ドラッグ用に必要） -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img
        bind:this={imgElement}
        src={imageDataUrl}
        class="media-element"
        alt=""
        draggable="true"
        style:width={computedWidth ? `${computedWidth}px` : undefined}
        style:height={computedHeight ? `${computedHeight}px` : undefined}
        on:click
      />
    {:else}
      <!-- 画像のローディング/失敗、動画の未ロード/失敗はキャンバス描画 -->
      <canvas
        bind:this={canvas}
        class="media-element"
        draggable="true"
        on:click
      />
    {/if}
  {/if}
  {#if isMissing}
    <div class="missing-overlay" aria-hidden="true">欠損メディア</div>
  {/if}
</div>

<style>
  .media-frame {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    position: relative;
    --media-controls-scale: 1;
    pointer-events: none;
  }
  .missing-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.65);
    color: #b42318;
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.08em;
    text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
    pointer-events: none;
  }
  .media-element {
    max-width: 100%;
    max-height: 100%;
    pointer-events: auto;
  }

  .video-container {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
  }

  .custom-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent 70%);
    padding: calc(0.25rem + 0.55rem * var(--media-controls-scale, 1));
    display: flex;
    flex-direction: column;
    gap: calc(0.2rem + 0.2rem * var(--media-controls-scale, 1));
    pointer-events: none;
  }

  .custom-controls > * {
    pointer-events: auto;
  }

  .seekbar-container {
    width: 100%;
    padding: calc(0.15rem + 0.25rem * var(--media-controls-scale, 1)) 0;
  }

  .custom-seekbar {
    position: relative;
    width: 100%;
    height: clamp(14px, calc(34px * var(--media-controls-scale, 1)), 34px);
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .custom-seekbar::before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: clamp(2px, calc(5px * var(--media-controls-scale, 1)), 5px);
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    pointer-events: none;
  }

  .seekbar-progress {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    height: clamp(2px, calc(5px * var(--media-controls-scale, 1)), 5px);
    background: #3b82f6;
    border-radius: 3px;
    pointer-events: none;
  }

  .seekbar-handle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: clamp(7px, calc(14px * var(--media-controls-scale, 1)), 14px);
    height: clamp(7px, calc(14px * var(--media-controls-scale, 1)), 14px);
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    transition: transform 0.1s;
  }

  .custom-seekbar:hover .seekbar-handle {
    transform: translate(-50%, -50%) scale(1.2);
  }

  .custom-seekbar:hover::before {
    background: rgba(255, 255, 255, 0.4);
  }

  .custom-seekbar:hover .seekbar-progress {
    background: #60a5fa;
  }

  .control-buttons {
    display: flex;
    align-items: center;
    gap: calc(0.3rem + 0.45rem * var(--media-controls-scale, 1));
    color: white;
  }

  .control-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: calc(0.1rem + 0.1rem * var(--media-controls-scale, 1));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
  }

  .control-btn:hover {
    opacity: 0.8;
  }

  .time-display {
    font-size: clamp(0.6rem, calc(0.65rem + 0.2rem * var(--media-controls-scale, 1)), 0.85rem);
    font-family: monospace;
    flex: 1;
  }
</style>
