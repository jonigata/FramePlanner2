<script lang="ts">
  import NumberEdit from "../utils/NumberEdit.svelte";
  import { RangeSlider } from '@skeletonlabs/skeleton';

  export let label;
  export let value;
  export let min = 0;
  export let max = 10;
  export let step = 0.1;
</script>

<div class="entry">
  <div class="label">
    {label}
  </div>
  <div class="hbox gap-2">
    <RangeSlider bind:value={value} min={min} max={max} step={step} name="value"/>
    <div class="number-box">
      <NumberEdit bind:value={value} min={min} max={max} allowDecimal={true}/>
    </div>
  </div>
</div>

<style>
  .entry {
    width: 100%;
    height: 24px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .label {
    text-align: left;
  }
  .number-box {
    width: 50px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
    color: #000;
  }
</style>