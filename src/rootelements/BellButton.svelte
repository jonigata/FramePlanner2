<script lang="ts">
  import { notebookOpen } from '../notebook/notebookStore';  
  import { onlineStatus } from '../utils/accountStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import BaseRootButton from './BaseRootButton.svelte';
  import bellIcon from '../assets/bell.png';
  
  function callFairy() {
    if ($onlineStatus !== "signed-in") {
      toastStore.trigger({ message: `AI機能の利用にはサインインが必要です`, timeout: 3000});
      return;
    }

    $notebookOpen = !$notebookOpen;
  }
</script>

<BaseRootButton icon={bellIcon} alt={"creative notebook"} hint={"創作ノート"} origin={"bottomright"} location={[0,0]} on:click={callFairy}/>
