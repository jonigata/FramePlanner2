<script>
  import { progress } from './loadingStore';
  import { ProgressBar } from '@skeletonlabs/skeleton';
</script>

{#if $progress != null}
  <div role="dialog" class="modal">
    <div class="content">
      <ProgressBar label="Progress Bar" value={$progress} max={1} />
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
  .content {
    width: 400px;
  }
</style>
