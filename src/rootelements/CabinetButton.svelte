<script lang="ts">
  import { fileManagerOpen } from '../filemanager/fileManagerStore';
  import { bookOperators } from '../bookeditor/workspaceStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import fileManagerIcon from '../assets/file-manager.webp';
  import { _ } from 'svelte-i18n';
  
  function openFileManager() {
    if (!$bookOperators) {
      // 無視できる気もするが、焦る必要もないので
      return;
    }
    $bookOperators.forceDelayedCommit();
    $fileManagerOpen = !$fileManagerOpen;
  }
</script>

<BaseRootButton icon={fileManagerIcon} alt={"file manager"} hint={$_('ui.cabinet')} origin={"bottomleft"} location={[0,0]} on:click={openFileManager}/>
