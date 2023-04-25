<script lang="ts">
  import Drawer from './Drawer.svelte'
  import { shapeChooserOpen, chosenShape } from "./shapeStore";
  import BubbleSample from "./BubbleSample.svelte";

  export let paperWidth = 96;
  export let paperHeight = 96;

  const shapes = [
    "square",
    "rounded",
    "soft",
    "harsh",
    "harsh-curve",
    "ellipse",
    "concentration",
    "polygon",
    "strokes",
    "double-strokes",
    "heart",
    "diamond",
    "motion-lines",
    "ellipse-mind",
    "soft-mind",
    "rounded-mind",
    "none",
  ];

  function choose(e, s) {
    $chosenShape = s;
    if (!e.detail.ctrlKey) {
      $shapeChooserOpen = false;
    }
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$shapeChooserOpen}
    placement="right"
    size="320px"
    on:clickAway={() => ($shapeChooserOpen = false)}
  >
    <div class="drawer-content">
      ctrlキーを押しながらクリックで閉じずに選択
      {#each shapes as s}
        <BubbleSample
          width={paperWidth}
          height={paperHeight}
          shape={s}
          on:click={(e) => choose(e, s)}
        />
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
