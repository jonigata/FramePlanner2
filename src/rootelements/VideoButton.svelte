<script lang="ts">
  import { type ModalSettings, modalStore, toastStore } from '@skeletonlabs/skeleton';
  import BaseRootButton from './BaseRootButton.svelte';
  import videoIcon from '../assets/video.webp';
  import { _ } from 'svelte-i18n';

  function isSharedArrayBufferUsable() {
    try {
      if (typeof SharedArrayBuffer === 'undefined') {
        console.log("SharedArrayBuffer is not defined")
        return false;
      }
      new SharedArrayBuffer(1); // 実際に使えるか確認
      return true;
    } catch {
      console.log("constructing SharedArrayBuffer failed");
      return false;
    }
  }

  function openVideoMaker() {
    if (!isSharedArrayBufferUsable()) {
      toastStore.trigger({ message: $_('messages.videoNotSupported'), timeout: 1500});
      return;
    }

    const d: ModalSettings = {
      type: 'component',
      component: 'videoMaker',
    };
    modalStore.trigger(d);    
  }
</script>

<BaseRootButton icon={videoIcon} alt={"video"} hint={$_('ui.video')} origin={"topright"} location={[0,2]} on:click={openVideoMaker}/>
