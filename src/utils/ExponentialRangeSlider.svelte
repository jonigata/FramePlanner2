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
  function onChangeRawValue(rv: number) {
    if (!ready) { return; }
    if (rv < exponentialMin) {
      value = rv;
    } else {
      value = Math.pow(exponentialMin, 1 + (rv - exponentialMin) * powPerStep);
      if (max != null && max < value) {
        value = max;
      }
    }
  }

  $:onChangeValue(value);
  function onChangeValue(v: number) {
    if (v < exponentialMin) {
      rawValue = v;
    } else {
      rawValue = exponentialMin + (Math.log(v) / Math.log(exponentialMin) - 1)/ powPerStep;
    }
  }

  onMount(() => {
    ready = true;
    onChangeValue(value);
  });

</script>

<RangeSlider bind:value={rawValue} min={min} max={getRawMax()} step={step} name={name}/>
