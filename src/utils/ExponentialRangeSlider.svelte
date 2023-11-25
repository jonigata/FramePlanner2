<script lang="ts">
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

  export let name: string;
  export let value = 1;
  export let min = 1;
  export let max = null;
  export let step = 1;
  export let exponentialMin = 100;
  export let exponentialRegion = 20;
  export let powPerStep = 0.02;

  let rawValue = 1;
  let ready = false;

  function getRawMax() {
    return exponentialMin + exponentialRegion;
  }

  $:onChangeRawValue(rawValue);
  function onChangeRawValue(rawValue: number) {
    if (!ready) { return; }
    if (rawValue < exponentialMin) {
      value = rawValue;
    } else {
      value = Math.pow(exponentialMin, 1 + (rawValue - exponentialMin) * powPerStep);
      if (max != null && max < value) {
        value = max;
      }
    }
  }

  $:onChangeValue(value);
  function onChangeValue(value: number) {
    if (value < exponentialMin) {
      rawValue = value;
    } else {
      rawValue = exponentialMin + (Math.log(value) / Math.log(exponentialMin) - 1)/ powPerStep;
    }
  }

  onMount(() => {
    ready = true;
    onChangeValue(value);
  });

</script>

<RangeSlider bind:value={rawValue} min={min} max={getRawMax()} step={step} name={name}/>
