<script>
  import { openModal, closeModal } from 'svelte-modals'
  import Loading from './Loading.svelte'
  import { loading } from './loadingStore'

  $: onLoadingChange($loading);
  function onLoadingChange(loading) {
    if (loading) {
      openModal(Loading);
    } else {
      closeModal();
    }
  }
</script>
