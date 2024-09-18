<script type="ts">
  import bellIcon from '../assets/bell.png';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { notebookOpen } from '../notebook/notebookStore';  
  
  function callFairy() {
    $notebookOpen = !$notebookOpen;
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={callFairy}
  use:toolTip={`クリエイティブノート`}>
  <img src={bellIcon} alt="creative notebook"/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    bottom: 20px;
    right: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
