<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { bubbleBucketPage, bubbleBucketDirty } from './bubbleBucketStore';
  import BubbleBucketItem from './BubbleBucketItem.svelte';

  let bubbles = [];

  function setUpBubbles() {
    bubbles = $bubbleBucketPage.bubbles;
  }
  $: if ($bubbleBucketPage != null) {
    setUpBubbles();
  }

  function close() {
    $bubbleBucketPage = null;
    $bubbleBucketDirty = true;
  }

</script>

<div class="drawer-outer">
  <Drawer placement={"right"} open={$bubbleBucketPage != null} size="720px" on:clickAway={close}>
    <div class="drawer-content">
      {#each bubbles as bubble}
        <BubbleBucketItem bubble={bubble} />
      {/each}
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding-top: 16px;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>