<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../../utils/NumberEdit.svelte';
  import { bubbleInspectorTarget } from './bubbleInspectorStore';
	import ColorPickerLabel from '../../utils/colorpicker/ColorPickerLabel.svelte';

  const bubble = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.bubble,
    (b, bit) => {
      bit!.bubble = b!;
      return bit;
    }
  );

  function getAny(v: unknown) {
    return v as any;
  }
</script>

{#if $bubble != null}
<div class="container">
  {#each Object.entries($bubble.optionSet) as [key, v], _ (key)}
    {@const value = getAny(v)}
    {#if value["type"] === "number"}
      <div class="row">
        <div class="label">{value["label"]}</div>
        <RangeSlider 
          name={key} 
          bind:value={$bubble.optionContext[key]} 
          min={value["min"]} 
          max={value["max"]} 
          step={value["step"]}/>
        <div class="number-box">
          <NumberEdit bind:value={$bubble.optionContext[key]} min={value["min"]} max={value["max"]} allowDecimal={true}/>
        </div>
      </div>
    {/if}
    {#if value["type"] === "boolean"}
      <div class="row">
        <div class="label">{value["label"]}</div>
        <input type="checkbox" name={key} bind:checked={$bubble.optionContext[key]}/>
      </div>
    {/if}
    {#if value["type"] === "color"}
      <div class="row">
        <div class="label">{value["label"]}</div>
          <div class="color-label">
            <ColorPickerLabel bind:hex={$bubble.optionContext[key]}/>
          </div>
      </div>
    {/if}
  {/each}
</div>
{/if}

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
  .color-label {
    width: 30px;
    height: 16px;
    margin-left: 4px;
    margin-right: 4px;
  }
</style>
