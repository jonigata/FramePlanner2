<script type="ts">
  import downloadIcon from '../assets/download.png';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { downloaderOpen } from '../downloader/downloaderStore';

  function download() {
    $downloaderOpen = !$downloaderOpen;
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={download}
  use:toolTip={`出版`}>
  <img src={downloadIcon} alt="call fairy"/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    top: 20px;
    right: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
