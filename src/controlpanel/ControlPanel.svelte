<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { mainBook, viewport, newPageProperty, redrawToken } from '../bookeditor/bookStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import Drawer from '../utils/Drawer.svelte'
  import { controlPanelOpen } from './controlPanelStore';
  import NumberEdit from '../utils/NumberEdit.svelte';
  import ExponentialRangeSlider from '../utils/ExponentialRangeSlider.svelte';

  let min = 256;
  let exponentialMin = 4096;
  let max = 9410;

  const scale = writableDerived(
  	viewport,
  	(v) => v?.scale,
  	(s, v) => {
      if (v) {
        v.scale = s;
        v.dirty = true;
        $redrawToken = true;
      }
      return v;
    }
  );

  let scalePercent = $scale * 100;
  scale.subscribe((v) => scalePercent = v * 100);
  $: $scale = scalePercent / 100;

  function setDimensions(w: number, h: number) {
    // 入れ物ごと交換するとbindが崩れる模様
    const p = $newPageProperty;
    p.paperSize[0] = w;
    p.paperSize[1] = h;
    $newPageProperty = p;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="left" open={$controlPanelOpen} size="400px" on:clickAway={() => $controlPanelOpen = false}>
    <div class="drawer-content">
      <div class="flex flex-col gap-2 m-2">
        <div class="hbox space-around canvas-size-container">
          <div class="vbox expand">
            <div class="hbox">
              <div class="font-bold slider-label">W</div>
              <div style="width: 140px;">
                <ExponentialRangeSlider name="range-slider" bind:value={$newPageProperty.paperSize[0]} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={1000} powPerStep={0.0001} step={1}/>
              </div>
              <div class="text-xs slider-value-text hbox gap-0.5">
                <div class="number-box"><NumberEdit bind:value={$newPageProperty.paperSize[0]} min={min} max={max}/></div>
                / {max}
              </div>
            </div>
            <div class="hbox">
              <div class="font-bold slider-label">H</div>
              <div style="width: 140px;">
                <ExponentialRangeSlider name="range-slider" bind:value={$newPageProperty.paperSize[1]} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={1000} powPerStep={0.0001} step={1}/>
              </div>
              <div class="text-xs slider-value-text hbox gap-0.5">
                <div class="number-box"><NumberEdit bind:value={$newPageProperty.paperSize[1]} min={min} max={max}/></div>
                 / {max}
              </div>
            </div>
          </div>
          <div class="vbox space-around" style="width: 90px; height: 52px;">
            <div class="hbox gap-0.5">
              <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1024, 1024)}>S2</button>
              <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1680, 2376)}>A3</button>
              <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(1456, 2056)}>B4</button>
            </div>
            <div class="hbox gap-0.5">
              <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(512, 512)}>S1</button>
              <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(840, 1188)}>A4</button>
              <button class="btn btn-sm variant-filled paper-size" on:click={() => setDimensions(728, 1028)}>B5</button>
            </div>  
          </div>
        </div>
        <div class="hbox gap my-1">
          進行方向
          <div class="radio-box hbox">
            <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
              <RadioItem bind:group={$mainBook.direction} name="direction" value={'right-to-left'}><span class="radio-text">◀</span></RadioItem>
              <RadioItem bind:group={$mainBook.direction} name="direction" value={'left-to-right'}><span class="radio-text">▶</span></RadioItem>
            </RadioGroup>
          </div>
          折返し
          <div class="radio-box hbox">
            <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
              <RadioItem bind:group={$mainBook.wrapMode} name="wrap-mode" value={'none'}><span class="radio-text">なし</span></RadioItem>
              <RadioItem bind:group={$mainBook.wrapMode} name="wrap-mode" value={'two-pages'}><span class="radio-text">2p</span></RadioItem>
              <RadioItem bind:group={$mainBook.wrapMode} name="wrap-omde" value={'one-page'}><span class="radio-text">1p</span></RadioItem>
            </RadioGroup>
          </div>
        </div>
        <div class="hbox gap" style="margin-top: 16px;">
          拡大率<RangeSlider name="scale" bind:value={$scale} min={0.1} max={10} step={0.01} style="width:200px;"/>
          <div class="number-box"><NumberEdit bind:value={scalePercent} min={10} max={1000}/></div>
          <button class="btn btn-sm variant-filled paper-size" on:click={() => $scale=1}>100%</button>
        </div>
      </div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .slider-label {
    width: 20px;
  }
  .slider-value-text {
    width: 76px;
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
  .paper-size {
    height: 20px;
  }
  .textarea {
    resize: none;
  }
  .radio-text {
    height: 10px;
  }
  .radio-box {
    height: 35px;
  }
  .radio-box :global(.radio-item) {
    padding-top: 0px;
    padding-bottom: 0px;
    padding-left: 10px;
    padding-right: 10px;
  }
</style>