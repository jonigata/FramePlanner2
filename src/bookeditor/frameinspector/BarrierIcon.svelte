<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { toolTip } from '../../utils/passiveToolTipStore';
  export let barriers: { left: boolean; right: boolean; top: boolean; bottom: boolean };
  export let toolTipText: string = "";

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  const size = 32;
  const lineWidth = 3;
  const onColor = "#1976d2";
  const offColor = "#fff";
  const borderColor = "#333";
  // 枠の端
  const edge = 4;
  // 棒の長さ調整用（端からの距離）
  const stickInset = 4;
  // 枠の描画用マージン
  const margin = 4;

  function draw() {
    if (!canvas) {return;}
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    // 各辺
    ctx.lineWidth = lineWidth;

    // top（yは枠の上端、xだけ短く）
    ctx.beginPath();
    ctx.strokeStyle = barriers.top ? onColor : offColor;
    ctx.moveTo(edge + stickInset, edge);
    ctx.lineTo(size - edge - stickInset, edge);
    ctx.stroke();

    // bottom（yは枠の下端、xだけ短く）
    ctx.beginPath();
    ctx.strokeStyle = barriers.bottom ? onColor : offColor;
    ctx.moveTo(edge + stickInset, size - edge);
    ctx.lineTo(size - edge - stickInset, size - edge);
    ctx.stroke();

    // left（xは枠の左端、yだけ短く）
    ctx.beginPath();
    ctx.strokeStyle = barriers.left ? onColor : offColor;
    ctx.moveTo(edge, edge + stickInset);
    ctx.lineTo(edge, size - edge - stickInset);
    ctx.stroke();

    // right（xは枠の右端、yだけ短く）
    ctx.beginPath();
    ctx.strokeStyle = barriers.right ? onColor : offColor;
    ctx.moveTo(size - edge, edge + stickInset);
    ctx.lineTo(size - edge, size - edge - stickInset);
    ctx.stroke();
  }

  $: barriers, canvas, draw();

  // クリックイベントをバブリング
  function handleClick(e: MouseEvent) {
    dispatch('click', e);
  }
</script>

<canvas
  bind:this={canvas}
  width={size}
  height={size}
  style="width:32px;height:32px;display:block;"
  use:toolTip={toolTipText}
  on:click={handleClick}
/>