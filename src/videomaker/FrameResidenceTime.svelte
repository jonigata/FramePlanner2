<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import NumberEdit from "../utils/NumberEdit.svelte";
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import type { DisplayProgramEntry } from './renderBook';

  const dispacher = createEventDispatcher();

  export let standardWait: number;
  export let index: number;
  export let entry: DisplayProgramEntry;

  let wait = 1;

  $: onWaitChanged(wait);
  function onWaitChanged(wait: number) {
    entry.residenceTime = wait - standardWait;
    dispacher('waitChanged', entry);
  }

  $: wait = standardWait + entry.residenceTime;

</script>

<div class="entry">
  <div class="label">
    Frame {index}
  </div>
  <div class="hbox">
    <RangeSlider bind:value={wait} min={0} max={10} step={0.1} name="wait"/>
    <div class="number-box">
      <NumberEdit bind:value={wait} min={0} max={10}/>
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
  .number-box {
    width: 50px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
  }
</style>