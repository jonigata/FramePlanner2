<script lang="ts">
  import { modalStore, ProgressRadial } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { detectPanels, LayerizeError } from './mangaLayerize';
  import { drawSelectionFrame } from '../lib/layeredCanvas/tools/draw/selectionFrame';
  import { rectToTrapezoid } from '../lib/layeredCanvas/tools/geometry/trapezoid';
  import type { Rect } from '../lib/layeredCanvas/tools/geometry/geometry';
  import mangaLayerizeIcon from '../assets/filmlist/manga-layerize.webp';

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  type DetectionState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

  // モーダルから受け取る context
  let title = '';
  let imageSource: HTMLCanvasElement | null = null;
  let imageBlob: Blob | null = null;

  let imageCanvas: HTMLCanvasElement;
  let overlayCanvas: HTMLCanvasElement;

  type PanelState = {
    /** 1-based reading-order index from manga-detect. */
    index: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    /** false = ユーザーが「このコマはレイヤー化しない」と指定した状態 */
    enabled: boolean;
  };

  type DrawInfo = {
    offsetX: number;
    offsetY: number;
    scale: number;
    drawWidth: number;
    drawHeight: number;
  };

  let panels: PanelState[] = [];
  let selectedIndex: number | null = null;
  let drawInfo: DrawInfo | null = null;
  let detectionState: DetectionState = 'idle';
  let errorMessage = '';

  $: enabledCount = panels.filter((p) => p.enabled).length;

  onMount(() => {
    const meta = $modalStore[0]?.meta ?? {};
    title = meta.title ?? 'レイヤー化するコマを選択';
    imageSource = meta.imageSource ?? null;
    imageBlob = meta.imageBlob ?? null;
    drawInfo = computeDrawInfo();
    drawBaseImage();
  });

  function computeDrawInfo(): DrawInfo | null {
    if (!imageSource) return null;
    const imageAspect = imageSource.width / imageSource.height;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    if (imageAspect > canvasAspect) {
      const drawWidth = CANVAS_WIDTH;
      const drawHeight = CANVAS_WIDTH / imageAspect;
      return {
        offsetX: 0,
        offsetY: (CANVAS_HEIGHT - drawHeight) / 2,
        scale: drawWidth / imageSource.width,
        drawWidth,
        drawHeight,
      };
    } else {
      const drawHeight = CANVAS_HEIGHT;
      const drawWidth = CANVAS_HEIGHT * imageAspect;
      return {
        offsetX: (CANVAS_WIDTH - drawWidth) / 2,
        offsetY: 0,
        scale: drawHeight / imageSource.height,
        drawWidth,
        drawHeight,
      };
    }
  }

  function drawBaseImage() {
    if (!imageCanvas || !imageSource || !drawInfo) return;
    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(imageSource, drawInfo.offsetX, drawInfo.offsetY, drawInfo.drawWidth, drawInfo.drawHeight);
  }

  async function fetchFrames() {
    if (!imageBlob) {
      errorMessage = '画像が用意できていません';
      detectionState = 'error';
      return;
    }
    if (detectionState === 'loading') return;
    detectionState = 'loading';
    errorMessage = '';
    panels = [];
    selectedIndex = null;
    redrawOverlay();
    try {
      const result = await detectPanels(imageBlob);
      if (result.frames.length === 0) {
        detectionState = 'empty';
        return;
      }
      panels = result.frames.map((f) => ({
        index: f.index,
        bbox: { x0: f.bbox[0], y0: f.bbox[1], x1: f.bbox[2], y1: f.bbox[3] },
        enabled: true,
      }));
      detectionState = 'ready';
      redrawOverlay();
    } catch (e) {
      console.error('[manga-layerize] detectPanels failed', e);
      errorMessage = e instanceof LayerizeError ? e.message : 'コマ検出に失敗しました';
      detectionState = 'error';
    }
  }

  function redrawOverlay() {
    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx || !drawInfo) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const p of panels) {
      const dx = drawInfo.offsetX + p.bbox.x0 * drawInfo.scale;
      const dy = drawInfo.offsetY + p.bbox.y0 * drawInfo.scale;
      const dw = (p.bbox.x1 - p.bbox.x0) * drawInfo.scale;
      const dh = (p.bbox.y1 - p.bbox.y0) * drawInfo.scale;

      // OFF (skip) のコマはグレー半透明で塗る
      if (!p.enabled) {
        ctx.fillStyle = 'rgba(60, 60, 60, 0.55)';
        ctx.fillRect(dx, dy, dw, dh);
      }

      const isSelected = p.index === selectedIndex;
      if (isSelected) {
        const rect: Rect = [dx, dy, dw, dh];
        const trapezoid = rectToTrapezoid(rect);
        const color = p.enabled ? 'rgba(255, 200, 0, 1)' : 'rgba(180, 180, 180, 1)';
        drawSelectionFrame(ctx, color, trapezoid, 3, 5, true, 0, [10, 10]);
      } else {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.enabled ? 'rgba(80, 200, 120, 0.9)' : 'rgba(180, 180, 180, 0.9)';
        if (!p.enabled) ctx.setLineDash([6, 4]);
        ctx.strokeRect(dx, dy, dw, dh);
        ctx.restore();
      }

      // index ラベル
      const label = String(p.index);
      ctx.font = 'bold 16px sans-serif';
      const padding = 4;
      const textMetrics = ctx.measureText(label);
      const labelW = textMetrics.width + padding * 2;
      const labelH = 22;
      ctx.fillStyle = p.enabled ? 'rgba(80, 200, 120, 0.9)' : 'rgba(150, 150, 150, 0.9)';
      ctx.fillRect(dx, dy, labelW, labelH);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, dx + padding, dy + labelH / 2);
    }
  }

  function getCanvasCoords(event: MouseEvent): [number, number] {
    const rect = overlayCanvas.getBoundingClientRect();
    const scaleX = overlayCanvas.width / rect.width;
    const scaleY = overlayCanvas.height / rect.height;
    return [(event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY];
  }

  function canvasToSource(cx: number, cy: number): [number, number] | null {
    if (!drawInfo) return null;
    return [(cx - drawInfo.offsetX) / drawInfo.scale, (cy - drawInfo.offsetY) / drawInfo.scale];
  }

  function findPanel(sourceX: number, sourceY: number): PanelState | null {
    // reading-order の最後 (= 通常コマの右下) から逆走査して、ネストや重なりに強くする
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (
        sourceX >= p.bbox.x0 && sourceX <= p.bbox.x1 &&
        sourceY >= p.bbox.y0 && sourceY <= p.bbox.y1
      ) {
        return p;
      }
    }
    return null;
  }

  function handleClick(event: MouseEvent) {
    if (detectionState === 'loading') return;
    if (detectionState !== 'ready') {
      // idle / empty / error のいずれでも、クリックで再解析を試みる
      fetchFrames();
      return;
    }
    if (!drawInfo) return;
    const [cx, cy] = getCanvasCoords(event);
    const src = canvasToSource(cx, cy);
    if (!src) return;
    const hit = findPanel(src[0], src[1]);
    if (!hit) {
      selectedIndex = null;
      redrawOverlay();
      return;
    }
    if (selectedIndex === hit.index) {
      // 既選択を再度クリック → ON/OFF トグル
      panels = panels.map((p) =>
        p.index === hit.index ? { ...p, enabled: !p.enabled } : p
      );
    } else {
      selectedIndex = hit.index;
    }
    redrawOverlay();
  }

  function selectAll(state: boolean) {
    panels = panels.map((p) => ({ ...p, enabled: state }));
    redrawOverlay();
  }

  function onCancel() {
    $modalStore[0]?.response?.(null);
    modalStore.close();
  }

  function onSubmit() {
    const skipPanels = panels.filter((p) => !p.enabled).map((p) => p.index);
    $modalStore[0]?.response?.({ skipPanels });
    modalStore.close();
  }

  $: if (imageSource && imageCanvas) {
    drawInfo = computeDrawInfo();
    drawBaseImage();
  }
  $: if (overlayCanvas && drawInfo) {
    redrawOverlay();
  }
</script>

<div class="card p-4 shadow-xl">
  <header class="card-header">
    <div class="title-row">
      <img src={mangaLayerizeIcon} alt={title} class="title-icon" />
      <h2>{title}</h2>
    </div>
  </header>
  <section class="p-4">
    <div class="dialog-body">
      <div class="canvas-pane">
        <div class="canvas-wrapper">
          <canvas
            bind:this={imageCanvas}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            class="base-canvas"
          />
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <canvas
            bind:this={overlayCanvas}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            class="overlay-canvas"
            on:click={handleClick}
          />
          {#if detectionState === 'loading'}
            <div class="loading-overlay">
              <div class="overlay-stack">
                <ProgressRadial width="w-12" stroke={120} />
                <span>コマ割りを認識中...</span>
              </div>
            </div>
          {:else if detectionState === 'error'}
            <div class="loading-overlay error">
              <span>{errorMessage}</span>
            </div>
          {:else if detectionState === 'empty'}
            <div class="loading-overlay subtle">
              <span>コマが検出できませんでした</span>
            </div>
          {:else if detectionState === 'idle'}
            <div class="loading-overlay start">
              <div class="overlay-stack">
                <span>画像をクリックしてコマ検出を開始してください</span>
              </div>
            </div>
          {/if}
        </div>
      </div>
      {#if detectionState === 'ready'}
        <div class="enabled-row">
          <div class="pill">{enabledCount}/{panels.length} レイヤー化</div>
          <div class="hint-text">クリックで選択、もう一度クリックで ON⇄OFF</div>
        </div>
        <div class="bulk-row">
          <button class="btn btn-sm variant-ghost-surface" type="button" on:click={() => selectAll(true)}>
            全部 ON
          </button>
          <button class="btn btn-sm variant-ghost-surface" type="button" on:click={() => selectAll(false)}>
            全部 OFF
          </button>
        </div>
      {/if}
    </div>
  </section>
  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" type="button" on:click={onCancel}>
      {$_('dialogs.cancel')}
    </button>
    <button
      class="btn variant-filled-primary"
      type="button"
      on:click={onSubmit}
      disabled={detectionState !== 'ready' || panels.length === 0}
    >
      {$_('dialogs.ok')}
    </button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin: 0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .pill {
    background: rgba(var(--color-primary-500), 0.1);
    color: rgb(var(--color-primary-700));
    border: 1px solid rgba(var(--color-primary-500), 0.35);
    border-radius: 999px;
    padding: 6px 12px;
    font-weight: 600;
    font-family: '源暎アンチック';
  }

  .dialog-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .canvas-pane {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .canvas-wrapper {
    position: relative;
    width: min(100%, 1100px);
    aspect-ratio: 4 / 3;
    max-height: 80vh;
    min-height: 520px;
    margin: 0 auto;
    background: radial-gradient(circle at 20% 20%, rgba(var(--color-primary-200), 0.2), transparent 40%),
      #0f172a;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 12px;
    overflow: hidden;
  }

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .overlay-canvas {
    cursor: pointer;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-align: center;
  }

  .loading-overlay.subtle {
    background: rgba(15, 23, 42, 0.25);
    pointer-events: none;
  }

  .loading-overlay.start {
    background: rgba(15, 23, 42, 0.55);
    pointer-events: none;
  }

  .loading-overlay.error {
    background: rgba(var(--color-error-700), 0.65);
    pointer-events: none;
  }

  .overlay-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .enabled-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
  }

  .hint-text {
    color: rgb(var(--color-surface-600));
    font-size: 14px;
  }

  .bulk-row {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
</style>
