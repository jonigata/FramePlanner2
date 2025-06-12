<script lang="ts">
  import { notebookOpen } from '../notebook/notebookStore';  
  import { onlineStatus } from '../utils/accountStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import BaseRootButton from './BaseRootButton.svelte';
  import bellIcon from '../assets/bell.webp';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import { _ } from 'svelte-i18n';
  
  function callFairy() {
    if (!$gadgetFileSystem) {
      return;
    }

    if ($onlineStatus !== "signed-in") {
      toastStore.trigger({ message: $_('messages.aiSignInRequired'), timeout: 3000});
      return;
    }

    $notebookOpen = !$notebookOpen;
  }
</script>

<BaseRootButton icon={bellIcon} alt={"creative notebook"} hint={$_('ui.bell')} origin={"bottomright"} location={[0,0]} on:click={callFairy}/>
