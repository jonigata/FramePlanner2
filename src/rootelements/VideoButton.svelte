<script lang="ts">
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import { toolTip } from '../utils/passiveToolTipStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import videoIcon from '../assets/video.png';

  function openVideoMaker() {
    const d: ModalSettings = {
      type: 'component',
      component: 'videoMaker',
    };
    modalStore.trigger(d);    
  }
</script>

<BaseRootButton icon={videoIcon} alt={"video"} hint={"ビデオ撮影"} origin={"topright"} location={[0,1]} on:click={openVideoMaker}/>
