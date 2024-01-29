<script>
  import { loading } from './loadingStore';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
</script>

{#if $loading}
  <div role="dialog" class="modal">
    <div class="contents">
      <ProgressRadial/>
    </div>
  </div>
{/if}

<style>
  .modal {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    position: relative;
  }
</style>
