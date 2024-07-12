<script lang="ts">
  import { pageInspectorTarget } from './pageInspectorStore';
  import Drawer from '../../utils/Drawer.svelte'
	import ColorPicker from 'svelte-awesome-color-picker';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import { redrawToken, mainBook } from '../bookStore';
  import { commitBook } from '../book';


  $: if ($pageInspectorTarget) {
    const p = $pageInspectorTarget;
    if (p.paperColor != p.frameTree.bgColor || p.frameColor != p.frameTree.borderColor || p.frameWidth != p.frameTree.borderWidth) {
      p.frameTree.bgColor = p.paperColor;
      p.frameTree.borderColor = p.frameColor;
      p.frameTree.borderWidth = p.frameWidth;
      commitBook($mainBook, "page-attribute");
      $redrawToken = true;
    }
  }

  function onClickAway() {
    $mainBook = $mainBook;
    $pageInspectorTarget = null;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$pageInspectorTarget != null} size="350px" on:clickAway={onClickAway}>
    <div class="drawer-content">
      <div class="flex flex-col gap-2 m-2 paper-color-picker">
        <h1>背景色</h1><ColorPicker bind:hex={$pageInspectorTarget.paperColor} label=""/>
        <h1>枠色</h1><ColorPicker bind:hex={$pageInspectorTarget.frameColor} label="" />
        <h1>枠の幅</h1><RangeSlider name="line" bind:value={$pageInspectorTarget.frameWidth} max={10} step={1} style="width:100px;"/>
      </div>
    </div>
  </Drawer>
</div>

<style>
  h1 {
    font-size: 1.2rem;
    font-weight: 500;
  }
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .paper-color-picker :global(.container .color) {
    width: 80px;
    height: 15px;
    border-radius: 4px;
  }
  .paper-color-picker :global(.container .alpha) {
    width: 80px;
    height: 15px;
    border-radius: 4px;
  }
</style>