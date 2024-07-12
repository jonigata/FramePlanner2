<script type="ts">
  import rulerIcon from '../assets/ruler.png';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { controlPanelOpen } from '../controlpanel/controlPanelStore';

  function download() {
    $controlPanelOpen = !$controlPanelOpen;
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={download}
  use:toolTip={`版形`}>
  <img src={rulerIcon} alt="ruler"/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    top: 44px;
    left: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
