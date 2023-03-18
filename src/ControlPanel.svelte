<script>
  import { draggable } from '@neodrag/svelte';
  import TemplateChooser from './TemplateChooser.svelte';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import InPlaceEdit from './InPlaceEdit.svelte';
  import './box.css';

  let width = 840;
  let height = 1188;
  let max = 4096;

  function submit(x) {

  }

</script>

<div class="control-panel" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar">Control Panel</div>
  <TemplateChooser />
  <div class="hbox space-around canvas-size-container">
    <div class="vbox expand">
      <div class="hbox">
        <div class="font-bold slider-label">Width</div>
        <RangeSlider name="range-slider" bind:value={width} max={max} step={1}>
        </RangeSlider>
        <div class="text-xs slider-value-text"><InPlaceEdit bind:value={width}/> / {max}</div>
      </div>
      <div class="hbox">
        <div class="font-bold slider-label">Height</div>
        <RangeSlider name="range-slider" bind:value={height} max={max} step={1}>
        </RangeSlider>
        <div class="text-xs slider-value-text"><InPlaceEdit bind:value={height}/> / {max}</div>
      </div>
    </div>
    <div class="hbox space-around" style="width: 90px;">
      <button class="btn btn-sm variant-filled" id="A4">A4</button>
      <button class="btn btn-sm variant-filled" id="B5">B5</button>
    </div>
  </div>

</div>

<style>
  .control-panel {
    top: 50%; /* Y軸の中心に移動 */
    left: 50%; /* X軸の中心に移動 */
    transform: translate(-50%, -50%); /* 自身のサイズに基づいて中心に配置 */

    position: absolute;
    width: 400px;
    height: 800px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    /* ... other styles */
  }
  .title-bar {
    cursor: move;
    padding: 8px;
  }
  .labeled-component {
    display: flex;
    gap: 4px;
  }
  .slider-label {
    width: 55px;
  }
  .slider-value-text {
    width: 80px;
    text-align: right;
  }
  .canvas-size-container {
    margin-right: 16px;
  }
</style>
