<script lang="ts">
  import { toolTipRequest } from "./passiveToolTipStore";
</script>

<div
  class="tooltip-container"
  class:active={$toolTipRequest}
  style="top: {$toolTipRequest?.position.y}px; left: {$toolTipRequest?.position.x}px"
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
    text-shadow: 1px 2px 3px #202020;
    font-family: "Kosugi Maru", sans-serif;
    font-size: 22px;
    color: #FFCB44;
  }

  .tooltip-container.active {
    opacity: 1;
  }
</style>
