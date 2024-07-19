<script lang="ts">
  import DragIsolator from '../../utils/listbox/DragIsolator.svelte';
  import type { Effect } from "../../lib/layeredCanvas/dataModels/film";
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../../utils/NumberEdit.svelte';
	import ColorPicker from 'svelte-awesome-color-picker';

  const parameterLists = {
    "OutlineEffect": [
      { name: "color", label: "色", type: "color" },
      { name: "width", label: "幅", type: "number", min: 0, max: 0.1, step: 0.001 },
    ],
  }

  export let effect: Effect;
</script>

<div class="list">
  {#each Object.entries(parameterLists[effect.tag]) as [key, value], _ (key)}
    <div class="list-item">
      {#if value["type"] === "number"}
        <DragIsolator>
          <div class="row">
            <div class="label">{value["label"]}</div>
            <RangeSlider 
              name={key} 
              bind:value={effect[key]} 
              min={value["min"]} 
              max={value["max"]} 
              step={value["step"]}/>
            <div class="number-box">
              <NumberEdit bind:value={effect[key]} min={value["min"]} max={value["max"]} allowDecimal={true}/>
            </div>
          </div>
        </DragIsolator>
      {/if}
      {#if value["type"] === "color"}
        <DragIsolator>
          <div class="row">
              <div class="label">{value["label"]}</div>
            <div class="color-label">
              <ColorPicker bind:hex={effect[key]} label=""/>
            </div>
          </div>
        </DragIsolator>
      {/if}
    </div>
  {/each}  
</div>

<style>
  .list {
    width: 100%;
  }
  .list-item {
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
  .row {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .color-label :global(.color-picker) {
    width: 20px;
  }
  .color-label :global(.container .color) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .color-label :global(.container .alpha) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
</style>