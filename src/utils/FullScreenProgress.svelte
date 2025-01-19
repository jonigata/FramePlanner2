<script lang="ts">
  import { openModal, closeModal } from 'svelte-modals'
  import Progress from './Progress.svelte'
  import { progress } from './loadingStore'

  let opened = false;

  $: onProgressChange($progress);
  function onProgressChange(progress: number | null) {
    if (progress != null) {
      if (!opened) {
        opened = true;
        openModal(Progress);
      }
    } else {
      opened = false;
      closeModal();
    }
  }
</script>
