<script lang="ts">
  import { toolTipRequest } from "./passiveToolTipStore";
  import { tick } from "svelte";

  let tooltip = null;
  let position = { x: 0, y: 0 };

  $: onRequest($toolTipRequest);
  async function onRequest(r: any) {
    if (!r || !tooltip) return;
    
    await tick(); // 多分要素の内容が更新されるまで待っている
    position = r.position;

    // ツールチップの幅の半分が指定したx位置よりも大きい場合、left位置を調整
    if (position.x < tooltip.clientWidth / 2) {
      position.x = tooltip.clientWidth / 2;
    }
    tooltip.style.top = `${position.y}px`;
    tooltip.style.left = `${position.x}px`;
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
    transform: translate(-50%, -50%);
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
    white-space: pre-line;
  }
</style>
