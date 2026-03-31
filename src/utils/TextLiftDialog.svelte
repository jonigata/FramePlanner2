<script lang="ts">
  import { modalStore, ProgressRadial } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { textMask } from '../supabase';
  import { TextLiftDialog_applyEraserStore } from '../materialBucket/tweakUiStore';
  import type { TextMaskResponse } from './edgeFunctions/types/imagingTypes.d';
  import type { TextLiftDialogResult, TextLiftSelection } from './textLiftFilm';
  import FeathralCost from './FeathralCost.svelte';
  import textLiftIcon from '../assets/filmlist/textlift.webp';
  import { fitCanvasToRange } from '../lib/layeredCanvas/tools/imageUtil';
  import { drawSelectionFrame } from '../lib/layeredCanvas/tools/draw/selectionFrame';
  import { rectToTrapezoid } from '../lib/layeredCanvas/tools/geometry/trapezoid';
  import type { Rect, Vector } from '../lib/layeredCanvas/tools/geometry/geometry';

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const RECOGNITION_COST = 0;
  const ERASE_COST = 0;
  // デバッグ用キャッシュ。無効化したいときは false にするかこの行をコメントアウトする
  const ENABLE_TEXTLIFT_CACHE = false;
  const CACHE_KEY_PREFIX = 'textlift-cache:';

  let title = '';
  let imageSource: HTMLCanvasElement | null = null;
  let imageCanvas: HTMLCanvasElement;
  let overlayCanvas: HTMLCanvasElement;

  type RecognitionState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

  let maskLayers: MaskLayer[] = [];
  let drawInfo: DrawInfo | null = null;
  let recognitionState: RecognitionState = 'idle';
  let errorMessage = '';
  let enabledCount = 0;

  // 選択とドラッグ状態
  let selectedLayerId: number | null = null;
  type DragMode = 'none' | 'move' | 'corner';
  type CornerType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  type DragState = {
    mode: DragMode;
    corner: CornerType | null;
    startMouse: Vector;
    startBox: { x: number; y: number; width: number; height: number };
    startCharHeight: number;
  };
  let dragState: DragState = { mode: 'none', corner: null, startMouse: [0, 0], startBox: { x: 0, y: 0, width: 0, height: 0 }, startCharHeight: 0 };
  const CORNER_HIT_RADIUS = 12; // コーナーのヒット判定半径（キャンバス座標）

  type DrawInfo = {
    offsetX: number;
    offsetY: number;
    scale: number;
    drawWidth: number;
    drawHeight: number;
  };

  type TextOrientation = TextMaskResponse['boxes'][number]['orientation'];

  type MaskLayer = {
    id: number;
    rawBox: { x0: number; y0: number; x1: number; y1: number };
    displayBox: { x: number; y: number; width: number; height: number };
    text?: string;
    enabled: boolean;
    charHeight: number;
    orientation: TextOrientation;
  };

  onMount(async () => {
    const args = $modalStore[0]?.meta;
    if (!args?.imageSource) {
      errorMessage = $_('dialogs.textLift.noImage');
      recognitionState = 'error';
      return;
    }

    title = args.title ?? $_('dialogs.textLift.title');
    imageSource = args.imageSource as HTMLCanvasElement;

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
    if (!imageCanvas || !imageSource) return;
    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!drawInfo) return;
    ctx.drawImage(imageSource, drawInfo.offsetX, drawInfo.offsetY, drawInfo.drawWidth, drawInfo.drawHeight);
  }

  function getCacheKey(canvas: HTMLCanvasElement) {
    return `${CACHE_KEY_PREFIX}${canvas.toDataURL('image/png')}`;
  }

  function loadCachedResponse(canvas: HTMLCanvasElement): TextMaskResponse | null {
    if (!ENABLE_TEXTLIFT_CACHE) return null;
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(getCacheKey(canvas));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TextMaskResponse;
      console.log('textLift cache hit');
      return parsed;
    } catch (error) {
      console.warn('textLift cache read failed', error);
      return null;
    }
  }

  function saveCachedResponse(canvas: HTMLCanvasElement, response: TextMaskResponse) {
    if (!ENABLE_TEXTLIFT_CACHE) return;
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(getCacheKey(canvas), JSON.stringify(response));
    } catch (error) {
      console.warn('textLift cache write failed', error);
    }
  }

  async function fetchMasks() {
    if (!imageSource || recognitionState === 'loading') return;

    recognitionState = 'loading';
    errorMessage = '';
    maskLayers = [];
    redrawOverlay();

    try {
      const cachedResponse = loadCachedResponse(imageSource);
      let response: TextMaskResponse;
      let coordScale = 1; // APIに送った画像から元画像への座標スケール係数

      if (cachedResponse) {
        response = cachedResponse;
      } else {
        // textMask APIは長辺が512以上1536以下である必要があるためリサイズ
        const resizedCanvas = fitCanvasToRange(imageSource, { min: 512, max: 1024 });
        coordScale = imageSource.width / resizedCanvas.width;
        console.log('Sending image for textMask...', imageSource.width, imageSource.height, '-> resized:', resizedCanvas.width, resizedCanvas.height, 'scale:', coordScale);
        response = await textMask({ dataUrl: resizedCanvas.toDataURL() });
        // キャッシュには座標スケール情報も含める
        saveCachedResponse(imageSource, { ...response, _coordScale: coordScale } as TextMaskResponse);
      }

      // キャッシュから取得した場合は座標スケール情報を復元
      if ('_coordScale' in response) {
        coordScale = (response as TextMaskResponse & { _coordScale?: number })._coordScale ?? 1;
      }

      if (!response.boxes || response.boxes.length === 0) {
        recognitionState = 'empty';
        return;
      }

      maskLayers = await prepareMaskLayers(response, coordScale);
      recognitionState = 'ready';
      redrawOverlay();
    } catch (error) {
      console.error('textMask failed', error);
      errorMessage = $_('dialogs.textLift.error');
      recognitionState = 'error';
    }
  }

  async function prepareMaskLayers(response: TextMaskResponse, coordScale: number = 1): Promise<MaskLayer[]> {
    if (!imageSource) return [];

    const layers = await Promise.all(response.boxes.map(async (box, idx) => {
      // charHeightも座標と同様にスケール
      const charHeight = box.char_height * coordScale;
      console.log('charHeight scaled:', box.char_height, '->', charHeight);
      // APIから返された座標をスケール係数で元画像の座標に変換
      // マスク矩形を上下左右それぞれ 0.5 * charHeight 広げる
      const margin = charHeight * 0.5;
      const actualX0 = Math.floor(box.box_2d.x0 * coordScale - margin);
      const actualY0 = Math.floor(box.box_2d.y0 * coordScale - margin);
      const actualX1 = Math.floor(box.box_2d.x1 * coordScale + margin);
      const actualY1 = Math.floor(box.box_2d.y1 * coordScale + margin);
      const width = Math.max(1, actualX1 - actualX0);
      const height = Math.max(1, actualY1 - actualY0);
      const orientation: TextOrientation = box.orientation ?? 'vertical';

      return {
        id: idx,
        rawBox: { x0: actualX0, y0: actualY0, x1: actualX1, y1: actualY1 },
        displayBox: { x: actualX0, y: actualY0, width, height },
        text: box.text,
        enabled: true,
        charHeight,
        orientation,
      };
    }));

    return layers.filter(Boolean) as MaskLayer[];
  }

  function redrawOverlay() {
    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!drawInfo) return;

    for (const layer of maskLayers) {
      const dx = drawInfo.offsetX + layer.displayBox.x * drawInfo.scale;
      const dy = drawInfo.offsetY + layer.displayBox.y * drawInfo.scale;
      const dw = layer.displayBox.width * drawInfo.scale;
      const dh = layer.displayBox.height * drawInfo.scale;

      const isSelected = layer.id === selectedLayerId;

      if (layer.enabled) {
        ctx.fillStyle = 'rgba(128, 0, 128, 0.25)';
        ctx.fillRect(dx, dy, dw, dh);
      }

      if (isSelected) {
        // 選択中のレイヤーは selectionFrame で描画
        const rect: Rect = [dx, dy, dw, dh];
        const trapezoid = rectToTrapezoid(rect);
        const color = layer.enabled ? 'rgba(255, 200, 0, 1)' : 'rgba(180, 180, 180, 1)';
        drawSelectionFrame(ctx, color, trapezoid, 3, 5, true, 0, [10, 10]);
      } else {
        // 選択されていないレイヤーは従来の描画
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = layer.enabled ? 'yellow' : 'rgba(200,200,200,0.9)';
        if (!layer.enabled) {
          ctx.setLineDash([6, 4]);
        }
        ctx.strokeRect(dx, dy, dw, dh);
        ctx.restore();
      }
    }
  }

  function toggleMask(targetId: number) {
    maskLayers = maskLayers.map(layer =>
      layer.id === targetId ? { ...layer, enabled: !layer.enabled } : layer
    );
    redrawOverlay();
  }

  // キャンバス座標からソース画像座標に変換
  function canvasToSource(canvasX: number, canvasY: number): Vector | null {
    if (!drawInfo) return null;
    return [
      (canvasX - drawInfo.offsetX) / drawInfo.scale,
      (canvasY - drawInfo.offsetY) / drawInfo.scale
    ];
  }

  // ソース画像座標からキャンバス座標に変換
  function sourceToCanvas(sourceX: number, sourceY: number): Vector | null {
    if (!drawInfo) return null;
    return [
      drawInfo.offsetX + sourceX * drawInfo.scale,
      drawInfo.offsetY + sourceY * drawInfo.scale
    ];
  }

  // レイヤーの四隅のキャンバス座標を取得
  function getLayerCorners(layer: MaskLayer): { topLeft: Vector; topRight: Vector; bottomLeft: Vector; bottomRight: Vector } | null {
    const box = layer.displayBox;
    const tl = sourceToCanvas(box.x, box.y);
    const tr = sourceToCanvas(box.x + box.width, box.y);
    const bl = sourceToCanvas(box.x, box.y + box.height);
    const br = sourceToCanvas(box.x + box.width, box.y + box.height);
    if (!tl || !tr || !bl || !br) return null;
    return { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br };
  }

  // コーナーのヒットテスト
  function hitTestCorner(canvasX: number, canvasY: number, layer: MaskLayer): CornerType | null {
    const corners = getLayerCorners(layer);
    if (!corners) return null;

    const testCorner = (p: Vector, name: CornerType): CornerType | null => {
      const dx = canvasX - p[0];
      const dy = canvasY - p[1];
      if (Math.sqrt(dx * dx + dy * dy) <= CORNER_HIT_RADIUS) {
        return name;
      }
      return null;
    };

    return testCorner(corners.topLeft, 'topLeft')
      ?? testCorner(corners.topRight, 'topRight')
      ?? testCorner(corners.bottomLeft, 'bottomLeft')
      ?? testCorner(corners.bottomRight, 'bottomRight');
  }

  // 矩形内のヒットテスト
  function hitTestBox(sourceX: number, sourceY: number, layer: MaskLayer): boolean {
    const box = layer.displayBox;
    return sourceX >= box.x && sourceX <= box.x + box.width &&
           sourceY >= box.y && sourceY <= box.y + box.height;
  }

  // イベントからキャンバス座標を取得
  function getCanvasCoords(event: MouseEvent): Vector {
    const rect = overlayCanvas.getBoundingClientRect();
    const scaleX = overlayCanvas.width / rect.width;
    const scaleY = overlayCanvas.height / rect.height;
    return [
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY
    ];
  }

  function handleMouseDown(event: MouseEvent) {
    if (!drawInfo) return;
    if (recognitionState === 'loading') return;
    if (recognitionState !== 'ready') {
      fetchMasks();
      return;
    }

    const [canvasX, canvasY] = getCanvasCoords(event);
    const source = canvasToSource(canvasX, canvasY);
    if (!source) return;
    const [sourceX, sourceY] = source;

    // 選択中のレイヤーがあれば、まずコーナーをチェック
    if (selectedLayerId !== null) {
      const selectedLayer = maskLayers.find(l => l.id === selectedLayerId);
      if (selectedLayer) {
        const corner = hitTestCorner(canvasX, canvasY, selectedLayer);
        if (corner) {
          // コーナードラッグ開始
          dragState = {
            mode: 'corner',
            corner,
            startMouse: [canvasX, canvasY],
            startBox: { ...selectedLayer.displayBox },
            startCharHeight: selectedLayer.charHeight,
          };
          return;
        }
      }
    }

    // レイヤーを探す（上から順に）
    for (let i = maskLayers.length - 1; i >= 0; i--) {
      const layer = maskLayers[i];
      if (hitTestBox(sourceX, sourceY, layer)) {
        if (selectedLayerId === layer.id) {
          // 既に選択中なら移動ドラッグ開始
          dragState = {
            mode: 'move',
            corner: null,
            startMouse: [canvasX, canvasY],
            startBox: { ...layer.displayBox },
            startCharHeight: layer.charHeight,
          };
        } else {
          // 新しいレイヤーを選択
          selectedLayerId = layer.id;
          redrawOverlay();
        }
        return;
      }
    }

    // 何もない場所をクリックしたら選択解除
    selectedLayerId = null;
    redrawOverlay();
  }

  function handleMouseMove(event: MouseEvent) {
    if (dragState.mode === 'none') {
      updateCursor(event);
      return;
    }
    if (!drawInfo) return;

    const [canvasX, canvasY] = getCanvasCoords(event);
    const dx = (canvasX - dragState.startMouse[0]) / drawInfo.scale;
    const dy = (canvasY - dragState.startMouse[1]) / drawInfo.scale;

    const layer = maskLayers.find(l => l.id === selectedLayerId);
    if (!layer) return;

    if (dragState.mode === 'move') {
      layer.displayBox = {
        x: dragState.startBox.x + dx,
        y: dragState.startBox.y + dy,
        width: dragState.startBox.width,
        height: dragState.startBox.height
      };
      // rawBoxも更新
      layer.rawBox = {
        x0: layer.displayBox.x,
        y0: layer.displayBox.y,
        x1: layer.displayBox.x + layer.displayBox.width,
        y1: layer.displayBox.y + layer.displayBox.height
      };
    } else if (dragState.mode === 'corner' && dragState.corner) {
      const startBox = dragState.startBox;
      let newX = startBox.x;
      let newY = startBox.y;
      let newWidth = startBox.width;
      let newHeight = startBox.height;

      switch (dragState.corner) {
        case 'topLeft':
          newX = startBox.x + dx;
          newY = startBox.y + dy;
          newWidth = startBox.width - dx;
          newHeight = startBox.height - dy;
          break;
        case 'topRight':
          newY = startBox.y + dy;
          newWidth = startBox.width + dx;
          newHeight = startBox.height - dy;
          break;
        case 'bottomLeft':
          newX = startBox.x + dx;
          newWidth = startBox.width - dx;
          newHeight = startBox.height + dy;
          break;
        case 'bottomRight':
          newWidth = startBox.width + dx;
          newHeight = startBox.height + dy;
          break;
      }

      // 最小サイズを保証
      const MIN_SIZE = 10;
      if (newWidth < MIN_SIZE) {
        if (dragState.corner === 'topLeft' || dragState.corner === 'bottomLeft') {
          newX = startBox.x + startBox.width - MIN_SIZE;
        }
        newWidth = MIN_SIZE;
      }
      if (newHeight < MIN_SIZE) {
        if (dragState.corner === 'topLeft' || dragState.corner === 'topRight') {
          newY = startBox.y + startBox.height - MIN_SIZE;
        }
        newHeight = MIN_SIZE;
      }

      layer.displayBox = { x: newX, y: newY, width: newWidth, height: newHeight };
      layer.rawBox = {
        x0: newX,
        y0: newY,
        x1: newX + newWidth,
        y1: newY + newHeight
      };

      // 枠サイズの変化に応じてcharHeightもスケール
      const scaleX = newWidth / dragState.startBox.width;
      const scaleY = newHeight / dragState.startBox.height;
      const boxScale = Math.sqrt(scaleX * scaleY);
      layer.charHeight = dragState.startCharHeight * boxScale;
    }

    maskLayers = [...maskLayers]; // リアクティブ更新
    redrawOverlay();
  }

  function handleMouseUp(_event: MouseEvent) {
    if (dragState.mode !== 'none') {
      dragState = { mode: 'none', corner: null, startMouse: [0, 0], startBox: { x: 0, y: 0, width: 0, height: 0 }, startCharHeight: 0 };
    }
  }

  function updateCursor(event: MouseEvent) {
    if (!overlayCanvas) return;
    const [canvasX, canvasY] = getCanvasCoords(event);
    const source = canvasToSource(canvasX, canvasY);

    // 選択中のレイヤーがあればコーナーチェック
    if (selectedLayerId !== null) {
      const selectedLayer = maskLayers.find(l => l.id === selectedLayerId);
      if (selectedLayer) {
        const corner = hitTestCorner(canvasX, canvasY, selectedLayer);
        if (corner) {
          if (corner === 'topLeft' || corner === 'bottomRight') {
            overlayCanvas.style.cursor = 'nwse-resize';
          } else {
            overlayCanvas.style.cursor = 'nesw-resize';
          }
          return;
        }
        // 選択中レイヤー内なら移動カーソル
        if (source && hitTestBox(source[0], source[1], selectedLayer)) {
          overlayCanvas.style.cursor = 'move';
          return;
        }
      }
    }

    // どこかのレイヤー内ならポインター
    if (source) {
      for (let i = maskLayers.length - 1; i >= 0; i--) {
        if (hitTestBox(source[0], source[1], maskLayers[i])) {
          overlayCanvas.style.cursor = 'pointer';
          return;
        }
      }
    }

    overlayCanvas.style.cursor = recognitionState === 'ready' ? 'default' : 'pointer';
  }

  function handleDoubleClick(event: MouseEvent) {
    if (!drawInfo) return;
    if (recognitionState !== 'ready') return;

    const [canvasX, canvasY] = getCanvasCoords(event);
    const source = canvasToSource(canvasX, canvasY);
    if (!source) return;
    const [sourceX, sourceY] = source;

    // ダブルクリックでトグル
    for (let i = maskLayers.length - 1; i >= 0; i--) {
      if (hitTestBox(sourceX, sourceY, maskLayers[i])) {
        toggleMask(maskLayers[i].id);
        break;
      }
    }
  }

  function onCancel() {
    $modalStore[0]?.response?.(null);
    modalStore.close();
  }

  function onSubmit() {
    if (maskLayers.length === 0) return;

    const selections: TextLiftSelection[] = maskLayers.map(layer => ({
      id: layer.id,
      enabled: layer.enabled,
      text: layer.text,
      box: layer.rawBox,
      orientation: layer.orientation,
      charHeight: layer.charHeight,
    }));

    const response: TextLiftDialogResult = {
      committed: true,
      selections,
      eraseFromSource: $TextLiftDialog_applyEraserStore,
    };

    $modalStore[0].response?.(response);
    modalStore.close();
  }

  $: if (imageSource && imageCanvas) {
    drawInfo = computeDrawInfo();
    drawBaseImage();
  }

  $: if (overlayCanvas && drawInfo) {
    redrawOverlay();
  }

  $: enabledCount = maskLayers.filter(m => m.enabled).length;
</script>

<div class="card p-4 shadow-xl">
  <header class="card-header">
    <div class="title-row">
      <img src={textLiftIcon} alt={$_('dialogs.textLift.title')} class="title-icon" />
      <h2>{title}</h2>
    </div>
  </header>
  <section class="p-4">
    <div class="dialog-body">
      <div class="status-row">
        {#if recognitionState !== 'ready'}
          <div class="status-text">
            {#if recognitionState === 'error'}
              {errorMessage}
            {:else if recognitionState === 'loading'}
              {$_('dialogs.textLift.loading')}
            {:else if recognitionState === 'empty'}
              {$_('dialogs.textLift.empty')}
            {:else}
              {$_('dialogs.textLift.notStarted')}
            {/if}
          </div>
        {/if}
      </div>
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
            on:mousedown={handleMouseDown}
            on:mousemove={handleMouseMove}
            on:mouseup={handleMouseUp}
            on:mouseleave={handleMouseUp}
            on:dblclick={handleDoubleClick}
          />
          {#if recognitionState === 'loading'}
            <div class="loading-overlay">
              <div class="overlay-stack">
                <ProgressRadial width="w-12" stroke={120} />
                <span>{$_('dialogs.textLift.loading')}</span>
              </div>
            </div>
          {:else if recognitionState === 'error'}
            <div class="loading-overlay error">
              <span>{errorMessage}</span>
            </div>
          {:else if recognitionState === 'empty'}
            <div class="loading-overlay subtle">
              <span>{$_('dialogs.textLift.empty')}</span>
            </div>
          {:else if recognitionState === 'idle'}
            <div class="loading-overlay start">
              <div class="overlay-stack">
                <span>{$_('dialogs.textLift.notStarted')}</span>
                <FeathralCost cost={RECOGNITION_COST} showsLabel={false} inline={true}/>
              </div>
            </div>
          {/if}
        </div>
      </div>
      {#if recognitionState === 'ready'}
        <div class="enabled-row">
          <div class="pill">
            {enabledCount}/{maskLayers.length || 0} {$_('dialogs.textLift.enabledLabel')}
          </div>
          <div class="status-text hint-text">
            {$_('dialogs.textLift.hint')}
          </div>
        </div>
        <div class="option-row">
          <label class="option-checkbox">
            <input type="checkbox" bind:checked={$TextLiftDialog_applyEraserStore}>
            <span>{$_('dialogs.textLift.eraseOption')}</span>
            <div class="cost-chip" class:disabled={!$TextLiftDialog_applyEraserStore}>
              <FeathralCost cost={ERASE_COST} showsLabel={false} inline={true}/>
            </div>
          </label>
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
      disabled={recognitionState !== 'ready' || maskLayers.length === 0}
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

  .pill {
    background: rgba(var(--color-primary-500), 0.1);
    color: rgb(var(--color-primary-700));
    border: 1px solid rgba(var(--color-primary-500), 0.35);
    border-radius: 999px;
    padding: 6px 12px;
    font-weight: 600;
    font-family: '源暎アンチック';
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

  .status-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .status-text {
    color: rgb(var(--color-surface-600));
    font-size: 14px;
  }

  .enabled-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  .hint-text {
    color: rgb(var(--color-surface-600));
    font-size: 14px;
  }

  .option-row {
    display: flex;
    justify-content: center;
    margin-top: 4px;
  }

  .option-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgb(var(--color-surface-700));
    font-size: 14px;
    flex-wrap: wrap;
  }

  .option-checkbox input {
    width: 18px;
    height: 18px;
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

  .cost-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: 1px solid rgba(var(--color-primary-500), 0.35);
    border-radius: 999px;
    background: rgba(var(--color-primary-500), 0.12);
    font-weight: 700;
    color: rgb(var(--color-surface-800));
  }

  .cost-chip.disabled {
    opacity: 0.55;
  }

</style>
