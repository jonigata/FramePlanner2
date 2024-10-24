<script lang="ts">
  import { openModal, closeModal } from 'svelte-modals'
  import Loading from './Loading.svelte'
  import { loading } from './loadingStore'

  $: onLoadingChange($loading);
  function onLoadingChange(loading: boolean) {
    if (loading) {
      console.log("open modal");
      openModal(Loading);
    } else {
      console.log("close modal");
      closeModal();
    }
  }
</script>
