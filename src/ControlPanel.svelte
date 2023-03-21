<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import TemplateChooser from './TemplateChooser.svelte';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from './NumberEdit.svelte';
  import './box.css';
  import { paperTemplate, paperWidth, paperHeight } from './paperStore';

  let max = 4096;

  function setDimensions(w: number, h: number) {
    $paperWidth = w;
    $paperHeight = h;
  }

  function applyTemplate(event) {
    paperTemplate.set(event.detail);
  }

</script>

<div class="control-panel variant-soft-surface rounded-container-token" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar variant-filled-surface rounded-container-token"><img class="title-image" id="load-frame-template" src="/src/assets/title-control-panel.png" alt="title"/></div>
  <div class="px-2">
    <TemplateChooser on:apply={applyTemplate} />
  </div>
  <div class="hbox space-around canvas-size-container">
    <div class="vbox expand">
      <div class="hbox">
        <div class="font-bold slider-label">Width</div>
        <RangeSlider name="range-slider" bind:value={$paperWidth} max={max} step={1}/>
        <div class="text-xs slider-value-text">
          <div class="number-box"><NumberEdit bind:value={$paperWidth} showSlider={false}/></div>
           / {max}
        </div>
      </div>
      <div class="hbox">
        <div class="font-bold slider-label">Height</div>
        <RangeSlider name="range-slider" bind:value={$paperHeight} max={max} step={1}/>
        <div class="text-xs slider-value-text">
          <div class="number-box"><NumberEdit bind:value={$paperHeight} showSlider={false}/></div>
           / {max}
        </div>
      </div>
    </div>
    <div class="hbox space-around" style="width: 90px;">
      <button class="btn btn-sm variant-filled" on:click={() => setDimensions(840, 1188)}>A4</button>
      <button class="btn btn-sm variant-filled" on:click={() => setDimensions(728, 1028)}>B5</button>
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
    display: flex;
    flex-direction: column;
  }
  .title-bar {
    cursor: move;
    padding: 2px;
    margin: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .title-image {
    width: 32px;
    height: 32px;
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
    margin-top: 4px;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
  }
</style>
