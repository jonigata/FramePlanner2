<script lang="ts">
  import Drawer from 'svelte-drawer-component';
  import { bubbleChooserOpen } from './bubbleStore'
  import BubbleSample from './BubbleSample.svelte';

  export let paperWidth = 96;
  export let paperHeight = 96;
  export let selectedShape = 'square';

  function choose(s) {
    console.log(s);
    selectedShape = s;
  }
</script>

<div class="drawer-outer">
  <Drawer open={$bubbleChooserOpen} placement="right" size="320px" on:clickAway={() => $bubbleChooserOpen = false}>
    <div class="drawer-content">
      {#each ['square', 'rounded', 'soft', 'harsh', 'harsh-curve', 'ellipse', 'concentration', 'polygon', 'strokes', 'double-strokes', 'heart', 'diamond', 'motion-lines', 'none'] as s}
        <BubbleSample width={paperWidth} height={paperHeight} pattern={s} on:click={()=>choose(s)}/>
      {/each}
    </div>
  </Drawer>
</div>

<style> 
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .drawer-content {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 16px;
  }
  .drawer-page-right {
    position: absolute;
    right: 16px;
    top: 16px;
  }
  .drawer-page-left {
    position: absolute;
    left: 16px;
    top: 16px;
  }
  .custom-font-panel {
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
    padding: 32px;
  }
  .font-sample {
    font-size: 22px;
    cursor: pointer;
  }
  .font-sample img {
    margin-left: 8px;
    cursor: pointer;
  }

</style>

