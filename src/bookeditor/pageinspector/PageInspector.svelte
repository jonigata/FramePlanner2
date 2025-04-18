<script lang="ts">
  import { pageInspectorTarget } from './pageInspectorStore';
  import Drawer from '../../utils/Drawer.svelte'
	import ColorPickerLabel from '../../utils/colorpicker/ColorPickerLabel.svelte';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import { redrawToken, mainBook } from '../workspaceStore';
  import { commitBook } from '../../lib/book/book';
  import { toolTip } from '../../utils/passiveToolTipStore';


  $: if ($pageInspectorTarget) {
    const p = $pageInspectorTarget;
    if (p.paperColor != p.frameTree.bgColor || p.frameColor != p.frameTree.borderColor || p.frameWidth != p.frameTree.borderWidth) {
      p.frameTree.bgColor = p.paperColor;
      p.frameTree.borderColor = p.frameColor;
      p.frameTree.borderWidth = p.frameWidth;
      commitBook($mainBook!, "page-attribute");
      $redrawToken = true;
    }
  }

  $: target = $pageInspectorTarget!;

  function onClickAway() {
    $mainBook = $mainBook;
    $pageInspectorTarget = null;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$pageInspectorTarget != null} size="350px" on:clickAway={onClickAway}>
    <div class="drawer-content">
      <div class="flex flex-col gap-2 m-2 paper-color-picker">
        <h1>背景色</h1>
        <div class="flex flex-col items-center">
          <div class="color-label" use:toolTip={"背景色"}>
            <ColorPickerLabel bind:hex={target.paperColor}/>
          </div>
        </div>
        <h1>枠色</h1>
        <div class="flex flex-col items-center">
          <div class="color-label" use:toolTip={"枠色"}>
            <ColorPickerLabel bind:hex={target.frameColor}/>
          </div>
        </div>
        <h1>枠の幅</h1><RangeSlider name="line" bind:value={target.frameWidth} max={10} step={1} style="width:100px;"/>
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
  .color-label {
    width: 50px;
    height: 20px;
    margin-left: 4px;
    margin-right: 4px;
  }
</style>