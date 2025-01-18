<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
</script>

<div class="box">
  <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
</div>

<style>
  .box {
    background-color: #fff;
    width: 800px;
    height: 600px;
    overflow-y: auto;
  }
  .back-button {
    margin-top: 16px;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
</style>