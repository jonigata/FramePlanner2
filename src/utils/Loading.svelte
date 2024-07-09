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
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
</style>
