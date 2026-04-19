<script lang="ts">
  import { colorPickerStore } from './colorPickerStore';

  export let wrapper: HTMLElement;
  export let isOpen: boolean;
  export let isDialog: boolean;

  const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

  async function pickColor() {
    if (!$colorPickerStore) return;
    if (eyeDropperSupported) {
      try {
        // @ts-ignore - EyeDropper は TS の lib にまだ無い
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if ($colorPickerStore) {
          $colorPickerStore.color = result.sRGBHex;
        }
      } catch {
        // ユーザーキャンセルは無視
      }
    } else {
      await pickFromCanvas();
    }
  }

  function pickFromCanvas(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!$colorPickerStore) { resolve(); return; }
      $colorPickerStore.picking = true;
      $colorPickerStore = $colorPickerStore;

      const body = document.body;
      const prevCursor = body.style.cursor;
      body.style.cursor = 'crosshair';

      function cleanup() {
        body.style.cursor = prevCursor;
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKey, true);
        if ($colorPickerStore) {
          $colorPickerStore.picking = false;
          $colorPickerStore = $colorPickerStore;
        }
        resolve();
      }

      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cleanup();
        }
      }

      function onClick(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const hex = target instanceof HTMLCanvasElement
          ? readCanvasPixel(target, e.clientX, e.clientY)
          : null;
        if (hex && $colorPickerStore) {
          $colorPickerStore.color = hex;
        }
        cleanup();
      }

      // 現在のクリックイベントが終わってから登録
      setTimeout(() => {
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKey, true);
      }, 0);
    });
  }

  function readCanvasPixel(canvas: HTMLCanvasElement, clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((clientY - rect.top) * (canvas.height / rect.height));
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const data = ctx.getImageData(x, y, 1, 1).data;
      return '#' + [data[0], data[1], data[2]]
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // tainted canvas
      return null;
    }
  }
</script>

<div
  bind:this={wrapper}
  class="wrapper"
  class:is-open={isOpen}
  role={isDialog ? 'dialog' : undefined}
  aria-label="color picker"
>
  <slot />
  <button class="eyedropper-button" on:click={pickColor} title={eyeDropperSupported ? 'スポイトで色を取得' : 'キャンバスをクリックして色を取得 (ESCで中止)'}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m2 22 1-1h3l9-9"/>
      <path d="M3 21v-3l9-9"/>
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>
    </svg>
    {eyeDropperSupported ? 'スポイト' : 'スポイト (キャンバス内)'}
  </button>
</div>

<style>
  .wrapper {
    padding: 8px;
    background-color: var(--cp-bg-color, white);
    margin: 0 10px 10px;
    border: 1px solid var(--cp-border-color, black);
    border-radius: 12px;
    display: none;
    width: max-content;
  }
  .is-open {
    display: inline-block;
  }
  [role='dialog'] {
    position: absolute;
    top: calc(var(--input-size, 25px) + 12px);
    left: 0;
    z-index: var(--picker-z-index, 2);
  }
  .eyedropper-button {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 6px 12px;
    width: 100%;
    justify-content: center;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    transition: background 0.1s;
  }
  .eyedropper-button:hover {
    background: #f0f0f0;
  }
</style>
