<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import writableDerived from "svelte-writable-derived";
  import type { DisplayProgramEntry } from './buildProgram';
  import NumberEdit from "../utils/NumberEdit.svelte";
  import { RangeSlider } from '@skeletonlabs/skeleton';

  const dispatcher = createEventDispatcher();

  export let standardWait: number;
  export let index: number;
  export let entry: DisplayProgramEntry;

  const min = 0;
  const max = 10;
  const step = 0.1;

  const standardWaitStore = writable(standardWait);
  $: standardWaitStore.set(standardWait);
  const wait = writableDerived(
    standardWaitStore,
    (n) => n + entry.residenceTime,
    (n, old) => {
      entry.residenceTime = n - standardWait
      dispatcher('waitChanged', n);
      return n;
    });

</script>

<div class="entry">
  <div class="label">
    Frame {index}
  </div>
  <div class="pair">
    <RangeSlider bind:value={$wait} min={min} max={max} step={step} name="range-slider"/>
    <div class="number-box">
      <NumberEdit bind:value={$wait} min={min} max={max} allowDecimal={true}/>
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
    width: 70px;
    text-align: left;
  }
  .pair {
    display: flex;
    flex-direction: row;
    gap: 12px;
  }
  .number-box {
    width: 50px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
  }
</style>