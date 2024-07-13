<script lang="ts">
  import { toolTipRequest } from "./passiveToolTipStore";
  import { tick } from "svelte";

  let tooltip = null;

  $: onRequest($toolTipRequest);
  async function onRequest(r: {message: string, rect: {left: number, top: number, width: number, height: number}}) {
    if (!r || !tooltip) return;
    
    await tick(); // 多分要素の内容が更新されるまで待っている
    let x = r.rect.left + r.rect.width / 2;
    const y = r.rect.top;

    // ツールチップの幅の半分が指定したx位置よりも大きい場合、left位置を調整
    if (x < tooltip.clientWidth / 2) {
      x = tooltip.clientWidth / 2;
    }
    tooltip.style.top = `${y}px`;
    tooltip.style.left = `${x}px`;
  }
</script>

<div
  class="tooltip-container variant-glass-secondary rounded-container-token"
  class:active={$toolTipRequest}
  bind:this={tooltip}
  >
  <div class="tooltip">
    {#if $toolTipRequest}
      {$toolTipRequest.message}
    {/if}
  </div>
</div>

<style>
  .tooltip-container {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    transform: translate(-50%, -100%);
    font-family: "Noto Sans JP", sans-serif;
    font-size: 18px;
    font-weight: 900;
    color: #000;
    z-index: 9999;
    padding: 8px;
  }
  .tooltip-container.active {
    opacity: 1;
  }
  .tooltip {
    white-space: pre;
  }
</style>
