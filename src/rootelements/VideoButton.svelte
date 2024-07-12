<script lang="ts">
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import videoIcon from '../assets/video.png';
  import { toolTip } from '../utils/passiveToolTipStore';

  function openVideoMaker() {
    const d: ModalSettings = {
      type: 'component',
      component: 'videoMaker',
    };
    modalStore.trigger(d);    
  }
</script>

<button class="variant-ghost-tertiary text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={openVideoMaker}
  use:toolTip={`ビデオ撮影`}>
  <img src={videoIcon} alt="video"/>
</button>

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 120px;
    height: 120px;
    top: 184px;
    right: 20px;
  }
  img {
    width: 80%;
    height: 80%;
  }
</style>
