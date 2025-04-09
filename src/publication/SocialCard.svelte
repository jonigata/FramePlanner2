<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import MangaView from "../mangaview/MangaView.svelte";
  import { mainBook } from "../bookeditor/bookStore";
  import { draggable } from '@neodrag/svelte';
  import type { DragEventData } from '@neodrag/svelte';
  import { buildBookRenderer, BookRenderer } from "../lib/layeredCanvas/tools/bookRenderer"
  import { canvasToBlob } from "../lib/layeredCanvas/tools/imageUtil";

  $: book = $mainBook!;

  async function handleSubmit() {
    const socialCard = await canvasToBlob(previewCanvas);
    $modalStore[0].response!({ socialCard });
    modalStore.close();
  }

  function handleSkip() {
    $modalStore[0].response!({ socialCard: null });
    modalStore.close();
  }

  let clipScale = 1.0; // 1 = ページの横幅
  let realScale = 1.0;
  let cursorWidth = 0; // デフォルト値
  let initialCursorWidth = cursorWidth;
  let clippingBox: HTMLDivElement;
  let cursor: HTMLDivElement;
  let previewCanvas: HTMLCanvasElement;
  let previewRenderer: BookRenderer;
  let clippingBoxRenderer: BookRenderer;

  function onCanvasChanged(e: CustomEvent<{ pageIndex: number, realScale: number, pageRect: [number,number,number,number], renderer: BookRenderer }>) {
    const {pageRect, renderer} = e.detail;
    clippingBoxRenderer = renderer;

    clippingBox.style.left = `${pageRect[0]}px`;
    clippingBox.style.top = `${pageRect[1]}px`;
    clippingBox.style.width = `${pageRect[2]}px`;
    clippingBox.style.height = `${pageRect[3]}px`;
    console.log("clippingBox", pageRect);
    if (cursorWidth === 0 || pageRect[2] < cursorWidth) {
      console.log("onCanvasChanged: setting cursorWidth", pageRect[2]);
      cursorWidth = pageRect[2];
    }

    previewRenderer = buildBookRenderer(previewCanvas, book, e.detail.pageIndex, 1);
    drawPreview();
  }

  let isResizing = false;
  let resizePosition = { x: 0, y: 0 };

  function handleResizeStart() {
    isResizing = true;
    initialCursorWidth = cursorWidth;
  }

  function handleResizeEnd(event: CustomEvent<DragEventData>) {
    isResizing = false;
  }  

  function handleResize(event: CustomEvent<DragEventData>) {
    if (!isResizing) return;
    
    const deltaX = event.detail.offsetX;
    let newWidth = initialCursorWidth + deltaX;
    const minCursorWidth = 301 * realScale * clipScale;
    if (newWidth < minCursorWidth) {
      newWidth = minCursorWidth;
    }
    
    if (newWidth <= clippingBox.clientWidth) {
      console.log("handleResize: setting cursorWidth");
      cursorWidth = newWidth;
      // 型アサーションを使用
      (event.target as HTMLElement).style.transform = 'translate(0, 0)';
    }

    resizePosition = { x: 0, y: 0 };

    drawPreview();
  }

  function handleMove(event: CustomEvent<DragEventData>) {
    drawPreview();
  }

  function drawPreview() {
    // get cursor center(clippingBox座標系)
    const cursorRect = cursor.getBoundingClientRect();
    const boxRect = (clippingBox.parentNode as HTMLElement).getBoundingClientRect();
    const cursorCenter = {
      x: cursorRect.left + cursorRect.width / 2 - boxRect.left,
      y: cursorRect.top + cursorRect.height / 2 - boxRect.top
    };
    const cursorPosition = clippingBoxRenderer.layeredCanvas.viewport.canvasPositionToViewportPosition([cursorCenter.x, cursorCenter.y]);
    console.log("cursorPosition", cursorPosition);

    previewRenderer.layeredCanvas.viewport.translate = [-cursorPosition[0], -cursorPosition[1]];
    previewRenderer.layeredCanvas.viewport.dirty = true;
    previewRenderer.layeredCanvas.redraw();

    const clippingBoxScale = clippingBoxRenderer.getScale();
    const cursorRealWidth = cursorRect.width / clippingBoxScale;

    const paper = clippingBoxRenderer.arrayLayer.array.papers[0];
    const paperCenter = paper.center;

    const previewWidth = previewCanvas.width;
    const previewHeight = previewCanvas.height;
    const previewScale = previewWidth / cursorRealWidth;
    const viewport = previewRenderer.layeredCanvas.viewport;
    viewport.scale = previewScale;
    viewport.dirty = true;
    viewport.translate = [
      (-paperCenter[0] - cursorPosition[0]) * previewScale,
      (-paperCenter[1] - cursorPosition[1]) * previewScale
    ];
    previewRenderer.layeredCanvas.redraw();
  }

  $: cursorHeight = cursorWidth / 1.91; // アスペクト比1.91:1を維持
</script>

<div class="card p-4 w-full max-w-lg flex flex-col items-center">
  <h2>ソーシャルカード編集</h2>
  <p>X(Twitter)に投稿したときに表示されます</p>
  <div class="social-card-view relative">
    <MangaView book={book} pageScale={1} on:canvasChanged={onCanvasChanged} showsPageButtons={false}/>
    <div class="clipping-box" bind:this={clippingBox}>
      <div
        class="box-cursor absolute"
        style="width: {cursorWidth}px; height: {cursorHeight}px;"
        use:draggable={
          {
            bounds: 'parent',
            legacyTranslate: false,
            disabled: isResizing,
          }
        }
        on:neodrag={handleMove}
        bind:this={cursor}
      >
        <div 
          class="resize-handle"
          use:draggable={
            {
              bounds: '.clipping-box',
              legacyTranslate: false,
              axis: 'x',
              position: resizePosition,
            }
          }
      
          on:pointerdown={handleResizeStart}
          on:neodrag:end={handleResizeEnd} 
          on:neodrag={handleResize}
        >
        </div>
      </div>
    </div>
  </div>
  <div class="card m-3 p-3 bg-surface-300 flex items-center justify-center">
    <canvas width="1024" height="536" bind:this={previewCanvas} style="width: 392px; height: 200px;"></canvas>
  </div>
  <div class="flex gap-2 mt-4 w-full">
    <button class="btn variant-ghost" on:click={handleSkip}>
      スキップ
    </button>
    <div class="flex-grow"></div>
    <button class="btn variant-filled-primary" on:click={handleSubmit}>
      OK
    </button>
  </div>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .social-card-view {
    width: 400px;
    height: 600px;
  }
  .clipping-box {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .box-cursor {
    top: 0;
    left: 0;
    border: 2px solid rgba(0, 0, 128, 0.5);
    background-color: rgba(0, 0, 128, 0.1);
    cursor: move;
  }  
  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    background-color: rgba(0, 0, 128, 0.5);
    cursor: se-resize;
  }
</style>
