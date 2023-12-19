<script lang="ts">
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../../utils/NumberEdit.svelte';
  import { bubble } from './bubbleInspectorStore';
</script>

<div class="container">
  {#each Object.entries($bubble.optionSet) as [key, value], _ (key)}
    {#if value["type"] === "number"}
      <div class="row">
        <div class="label">{value["label"]}</div>
        <RangeSlider 
          name={key} 
          bind:value={$bubble.optionContext[key]} 
          min={value["min"]} 
          max={value["max"]} 
          step={value["step"]}/>
        <div class="number-box"><NumberEdit bind:value={$bubble.optionContext[key]} allowDecimal={true}/></div>
      </div>
    {/if}
    {#if value["type"] === "boolean"}
      <div class="row">
        <div class="label">{value["label"]}</div>
        <input type="checkbox" name={key} bind:checked={$bubble.optionContext[key]}/>
      </div>
    {/if}
  {/each}
</div>

<style>
  .container {
    width: 100%;
  }
  .row {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .label {
    width: 90px;
    text-align: left;
    font-size: 14px;
  }
  .number-box {
    width: 30px;
    height: 20px;
    display: inline-block;
    text-align: right;
    font-size: 12px;
  }
</style>



