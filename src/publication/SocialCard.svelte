<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import MangaView from "../mangaview/MangaView.svelte";
  import { mainBook } from "../bookeditor/bookStore";
  import type { Page } from "manga-renderer";
  import { draggable } from '@neodrag/svelte';
  import type { DragEventData } from '@neodrag/svelte';

  $: book = $mainBook!;

  function handleSubmit() {
    $modalStore[0].response!({ result: "ok" });
    modalStore.close();
  }

  let clipScale = 1.0; // 1 = ページの横幅
  let realScale = 1.0;
  let cursorWidth = 0; // デフォルト値
  let initialCursorWidth = cursorWidth;
  $: cursorHeight = cursorWidth / 1.91; // アスペクト比1.91:1を維持
  let clippingBox: HTMLDivElement;

  function onCanvasChanged(e: CustomEvent<{ page: Page, realScale: number, pageRect: [number,number,number,number] }>) {
    console.log("onCanvasChanged", e.detail);
    console.log("clippingWidth", cursorWidth);
    const pageRect = e.detail.pageRect;
    clippingBox.style.left = `${pageRect[0]}px`;
    clippingBox.style.top = `${pageRect[1]}px`;
    clippingBox.style.width = `${pageRect[2]}px`;
    clippingBox.style.height = `${pageRect[3]}px`;
    realScale = e.detail.realScale;
    if (cursorWidth === 0) {
      cursorWidth = e.detail.page.paperSize[0] * realScale * clipScale;
    }
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
        cursorWidth = newWidth;
        // 型アサーションを使用
        (event.target as HTMLElement).style.transform = 'translate(0, 0)';
    }

    resizePosition = { x: 0, y: 0 };
  }

</script>

<div class="card p-4 w-full max-w-lg flex flex-col items-center">
  <h2>ソーシャルカード編集</h2>
  <p>X(Twitter)に投稿したときに表示されます</p>
  <div class="card m-2 bg-gray-200 flex items-center justify-center">
    <canvas width="392" height="200"></canvas>
  </div>
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
  <button class="btn variant-filled-primary" on:click={handleSubmit}>
    保存
  </button>
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
