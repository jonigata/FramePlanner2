<script lang="ts">
  import NumberEdit from './NumberEdit.svelte';
  import ExponentialRangeSlider from './ExponentialRangeSlider.svelte';

  export let label: string;
  export let labelWidth: string = "100px";
  export let value: number;
  export let min: number;
  export let max: number;
  export let step: number = 1;
  export let exponentialMin: number = 1;
  export let exponentialRegion: number = 1000;
  export let powPerStep: number = 0.0001;
</script>

<div class="flex flex-row gap-0.5 expand w-full h-full">
  <div class="font-bold slider-label" style="width: {labelWidth}">{label}</div>
  <div class="grow">
    <ExponentialRangeSlider name="range-slider" bind:value={value} min={min} max={max} exponentialMin={exponentialMin} exponentialRegion={exponentialRegion} powPerStep={powPerStep} step={step}/>
  </div>
  <div class="text-xs number-box">
    <NumberEdit bind:value={value} min={min} max={max}/>
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
