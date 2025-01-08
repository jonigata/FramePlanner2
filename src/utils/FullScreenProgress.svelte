<script lang="ts">
  import { openModal, closeModal } from 'svelte-modals'
  import Progress from './Progress.svelte'
  import { progress } from './loadingStore'

  let opened = false;

  $: onProgressChange($progress);
  function onProgressChange(progress: number | null) {
    if (progress != null) {
      console.log("open modal");
      if (!opened) {
        opened = true;
        openModal(Progress);
      }
    } else {
      console.log("close modal");
      opened = false;
      closeModal();
    }
  }
</script>
