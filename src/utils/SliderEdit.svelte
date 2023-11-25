<script lang="ts">
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from './NumberEdit.svelte';

  export let label: string;
  export let value: number;
  export let min: number;
  export let max: number;
  export let step: number = 1;
</script>

<div class="hbox gap-0.5 expand">
  <div class="font-bold slider-label">{label}</div>
  <div class="grow">
    <RangeSlider name="batch-count" bind:value={value} min={min} max={max} step={step}/>
  </div>
  <div class="text-xs number-box">
    <NumberEdit bind:value={value}/>
  </div>  
</div>

<style>
  .slider-label {
    width: 100px;    
    text-align: left;
  }
  .number-box {
    width: 30px;
    height: 20px;
    display: inline-block;
    text-align: right;
  }
</style>