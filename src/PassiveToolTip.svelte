<script lang="ts">
  import { toolTipRequest } from "./passiveToolTipStore";
  import { fontChooserOpen } from './fontStore';
  import { aboutOpen } from './aboutStore';
</script>

<div
  class="tooltip-container"
  class:active={$toolTipRequest}
  style="top: {$toolTipRequest?.position.y}px; left: {$toolTipRequest?.position.x}px"
>
  <div class="tooltip">
    {#if $toolTipRequest && !$fontChooserOpen && !$aboutOpen}
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
    text-shadow: 1px 2px 3px #000;
    font-family: "Kosugi Maru", sans-serif;
    font-size: 18px;
    color: #f0c46b;
    z-index: 9999;
  }

  .tooltip-container.active {
    opacity: 1;
  }
</style>
