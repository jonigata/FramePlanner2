<script type="ts">
  import { materialBucketOpen } from '../materialBucket/materialBucketStore';
  import { mainBookFileSystem } from '../filemanager/fileManagerStore';
  import BaseRootButton from './BaseRootButton.svelte';
  import stampIcon from '../assets/stamp.webp';
  
  function openMaterialBucket() {
    if (!$mainBookFileSystem) { return; }
    $materialBucketOpen = !$materialBucketOpen;
  }
</script>

<BaseRootButton icon={stampIcon} alt={"stamps"} hint={"素材集"} origin={"bottomleft"} location={[0,2]} on:click={openMaterialBucket}/>
