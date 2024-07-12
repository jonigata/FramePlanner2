<script type="ts">
  import aboutIcon from '../assets/about.png';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { aboutOpen } from '../about/aboutStore';

  function download() {
    $aboutOpen = !$aboutOpen;
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={download}
  use:toolTip={`FramePlannerについて`}>
  <img src={aboutIcon} alt="about"/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    top: 184px;
    left: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
