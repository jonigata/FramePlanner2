<script lang="ts">
  import { fileManagerOpen } from '../filemanager/fileManagerStore';
  import { bookEditor } from '../bookeditor/bookStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import fileManagerIcon from '../assets/file-manager.webp';
  
  function openFileManager() {
    $bookEditor!.forceDelayedCommit();
    $fileManagerOpen = !$fileManagerOpen;
  }
</script>

<BaseRootButton icon={fileManagerIcon} alt={"file manager"} hint={"ファイルマネージャー"} origin={"bottomleft"} location={[0,0]} on:click={openFileManager}/>
